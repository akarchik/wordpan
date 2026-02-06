import asyncio
import os
import warnings
from functools import wraps
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

# Load .env from the ai project root (directory containing run.py)
load_dotenv(Path(__file__).resolve().parent / ".env")

from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client

from lib.tracer import traceable

warnings.filterwarnings("ignore", category=SyntaxWarning, module="pysbd")

# Lazy imports - defer to avoid import chain issues during startup
_random_phrase_crew_class = None
_phrase_output_schema = None

def get_random_phrase_crew():
    global _random_phrase_crew_class
    if _random_phrase_crew_class is None:
        from crews.random_phrase_crew.crew import RandomPhraseCrew
        _random_phrase_crew_class = RandomPhraseCrew
    return _random_phrase_crew_class

def get_phrase_output_schema():
    global _phrase_output_schema
    if _phrase_output_schema is None:
        from crews.random_phrase_crew.schemas import PhraseOutput
        _phrase_output_schema = PhraseOutput
    return _phrase_output_schema

# Initialize Flask app
app = Flask(__name__)

# Configure CORS - allow requests from localhost frontend
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:5173",  # Vite dev server
            "http://localhost:3000",  # Alternative port
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL", "http://127.0.0.1:54321")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)


def require_auth(f):
    """
    Decorator to require authentication for endpoints.
    Validates the JWT token from the Authorization header.
    """
    @wraps(f)
    async def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return jsonify({"error": "Authorization header is required"}), 401

        # Extract token from "Bearer <token>" format
        try:
            token = auth_header.split(" ")[1] if " " in auth_header else auth_header
        except IndexError:
            return jsonify({"error": "Invalid authorization header format"}), 401

        try:
            # Verify the JWT token with Supabase
            user_response = supabase.auth.get_user(token)
            request.user = user_response.user
        except Exception as e:
            return jsonify({"error": f"Authentication failed: {str(e)}"}), 401

        return await f(*args, **kwargs)

    return decorated_function


async def get_user_context(user_id: str) -> Optional[str]:
    """
    Fetch user context from Supabase.

    Args:
        user_id: The user's UUID

    Returns:
        User context string or None if not found
    """
    try:
        # Fetch user context from the profiles table
        response = supabase.table("profiles").select("context").eq("id", user_id).single().execute()

        if response.data:
            return response.data.get("context", "")
        return None
    except Exception as e:
        print(f"Error fetching user context: {e}")
        return None


@traceable
async def generate_random_phrase(words: list[str], user_context: str):
    """
    Generate a random phrase using the RandomPhraseCrew.

    Args:
        words: List of words to use in the phrase
        user_context: User context to personalize the phrase

    Returns:
        PhraseOutput with phrase and words used
    """
    inputs = {
        'words': jsonify(words).get_data(as_text=True),
        'user_context': jsonify(user_context).get_data(as_text=True)
    }

    RandomPhraseCrew = get_random_phrase_crew()
    result = await RandomPhraseCrew().crew().kickoff_async(inputs=inputs)

    # CrewAI returns a result with a .pydantic attribute containing the Pydantic model
    if hasattr(result, 'pydantic'):
        return result.pydantic

    # Fallback - return a basic PhraseOutput
    PhraseOutput = get_phrase_output_schema()
    return PhraseOutput(phrase=str(result), words=words)


@app.route("/health", methods=["GET"])
async def health():
    """Health check endpoint."""
    return jsonify({"status": "healthy"}), 200


# Word Pairs CRUD Endpoints

@app.route("/api/word-pairs", methods=["GET"])
@require_auth
async def get_word_pairs():
    """
    Get all word pairs for the authenticated user with pagination.

    Query params:
        page: Page number (1-indexed, default: 1)
        limit: Items per page (default: 20)

    Headers:
        Authorization: Bearer <jwt_token>

    Response:
        {
            "data": [...],
            "count": total_count,
            "page": current_page,
            "limit": items_per_limit
        }
    """
    try:
        user_id = request.user.id
        page = request.args.get("page", 1, type=int)
        limit = request.args.get("limit", 20, type=int)
        
        # Validate pagination params
        if page < 1:
            page = 1
        if limit < 1 or limit > 100:
            limit = 20

        offset = (page - 1) * limit

        # Fetch word pairs with count
        response = supabase.table("word_pairs").select(
            "*", count="exact"
        ).eq("user_id", user_id).order(
            "created_at", desc=True
        ).range(offset, offset + limit - 1).execute()

        return jsonify({
            "data": response.data,
            "count": response.count,
            "page": page,
            "limit": limit
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to fetch word pairs: {str(e)}"}), 500


@app.route("/api/word-pairs", methods=["POST"])
@require_auth
async def create_word_pair():
    """
    Create a new word pair for the authenticated user.

    Request body:
        {
            "word1": "string",
            "word2": "string",
            "pair_type": "synonym|antonym|translation|related|custom",
            "description": "string (optional)"
        }

    Headers:
        Authorization: Bearer <jwt_token>

    Response:
        {
            "id": "uuid",
            "user_id": "uuid",
            "word1": "string",
            "word2": "string",
            "pair_type": "string",
            "description": "string",
            "created_at": "timestamp",
            "updated_at": "timestamp"
        }
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "Request body is required"}), 400

        # Validate required fields
        required_fields = ["word1", "word2"]
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"error": f"'{field}' is required"}), 400

        # Validate pair_type if provided
        valid_types = ["synonym", "antonym", "translation", "related", "custom"]
        pair_type = data.get("pair_type", "custom")
        if pair_type not in valid_types:
            return jsonify({"error": f"'pair_type' must be one of {valid_types}"}), 400

        user_id = request.user.id

        # Create the word pair
        response = supabase.table("word_pairs").insert({
            "user_id": user_id,
            "word1": data["word1"].strip(),
            "word2": data["word2"].strip(),
            "pair_type": pair_type,
            "description": data.get("description", "").strip() if data.get("description") else None
        }).execute()

        if response.data:
            return jsonify(response.data[0]), 201
        else:
            return jsonify({"error": "Failed to create word pair"}), 500

    except Exception as e:
        return jsonify({"error": f"Failed to create word pair: {str(e)}"}), 500


@app.route("/api/word-pairs/<pair_id>", methods=["PUT"])
@require_auth
async def update_word_pair(pair_id):
    """
    Update a word pair (only owner can update).

    Path params:
        pair_id: UUID of the word pair

    Request body:
        {
            "word1": "string (optional)",
            "word2": "string (optional)",
            "pair_type": "synonym|antonym|translation|related|custom (optional)",
            "description": "string (optional)"
        }

    Headers:
        Authorization: Bearer <jwt_token>

    Response:
        Updated word pair object
    """
    try:
        user_id = request.user.id
        data = request.get_json()

        if not data:
            return jsonify({"error": "Request body is required"}), 400

        # Fetch the word pair to verify ownership
        pair = supabase.table("word_pairs").select("*").eq("id", pair_id).single().execute()

        if not pair.data:
            return jsonify({"error": "Word pair not found"}), 404

        if pair.data["user_id"] != user_id:
            return jsonify({"error": "Unauthorized"}), 403

        # Prepare update data
        update_data = {}

        if "word1" in data:
            update_data["word1"] = data["word1"].strip()
        if "word2" in data:
            update_data["word2"] = data["word2"].strip()
        if "pair_type" in data:
            valid_types = ["synonym", "antonym", "translation", "related", "custom"]
            if data["pair_type"] not in valid_types:
                return jsonify({"error": f"'pair_type' must be one of {valid_types}"}), 400
            update_data["pair_type"] = data["pair_type"]
        if "description" in data:
            update_data["description"] = data["description"].strip() if data.get("description") else None

        if not update_data:
            return jsonify({"error": "No fields to update"}), 400

        update_data["updated_at"] = "now()"

        # Update the word pair
        response = supabase.table("word_pairs").update(update_data).eq(
            "id", pair_id
        ).eq("user_id", user_id).execute()

        if response.data:
            return jsonify(response.data[0]), 200
        else:
            return jsonify({"error": "Failed to update word pair"}), 500

    except Exception as e:
        return jsonify({"error": f"Failed to update word pair: {str(e)}"}), 500


@app.route("/api/word-pairs/<pair_id>", methods=["DELETE"])
@require_auth
async def delete_word_pair(pair_id):
    """
    Delete a word pair (only owner can delete).

    Path params:
        pair_id: UUID of the word pair

    Headers:
        Authorization: Bearer <jwt_token>

    Response:
        Empty 204 No Content on success
    """
    try:
        user_id = request.user.id

        # Fetch the word pair to verify ownership
        pair = supabase.table("word_pairs").select("*").eq("id", pair_id).single().execute()

        if not pair.data:
            return jsonify({"error": "Word pair not found"}), 404

        if pair.data["user_id"] != user_id:
            return jsonify({"error": "Unauthorized"}), 403

        # Delete the word pair
        supabase.table("word_pairs").delete().eq("id", pair_id).eq(
            "user_id", user_id
        ).execute()

        return "", 204

    except Exception as e:
        return jsonify({"error": f"Failed to delete word pair: {str(e)}"}), 500


@app.route("/api/favorite-words", methods=["GET"])
@require_auth
async def get_favorite_words():
    """
    Get all favorite words for the authenticated user.

    Query parameters:
        page: int (default: 1)
        limit: int (default: 50)

    Headers:
        Authorization: Bearer <jwt_token>

    Response:
        {
            "data": [
                {
                    "id": "uuid",
                    "user_id": "uuid",
                    "word": "string",
                    "created_at": "timestamp"
                }
            ],
            "count": int,
            "page": int,
            "limit": int
        }
    """
    try:
        user_id = request.user.id
        page = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", 50))
        offset = (page - 1) * limit

        # Get count
        count_response = supabase.table("favorite_words").select(
            "id", count="exact"
        ).eq("user_id", user_id).execute()

        count = count_response.count

        # Get paginated data
        response = supabase.table("favorite_words").select("*").eq(
            "user_id", user_id
        ).order("created_at", desc=True).range(offset, offset + limit - 1).execute()

        return jsonify({
            "data": response.data,
            "count": count,
            "page": page,
            "limit": limit
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to fetch favorite words: {str(e)}"}), 500


@app.route("/api/favorite-words", methods=["POST"])
@require_auth
async def add_favorite_word():
    """
    Add a word to the authenticated user's favorites.

    Request body:
        {
            "word": "string"
        }

    Headers:
        Authorization: Bearer <jwt_token>

    Response:
        {
            "id": "uuid",
            "user_id": "uuid",
            "word": "string",
            "created_at": "timestamp"
        }
    """
    try:
        data = request.get_json()

        if not data or "word" not in data:
            return jsonify({"error": "Request body must include 'word'"}), 400

        word = data.get("word", "").strip().lower()

        if not word:
            return jsonify({"error": "'word' cannot be empty"}), 400

        user_id = request.user.id

        # Try to insert the word
        response = supabase.table("favorite_words").insert({
            "user_id": user_id,
            "word": word
        }).execute()

        if response.data and len(response.data) > 0:
            return jsonify(response.data[0]), 201
        else:
            # Word already exists (unique constraint)
            return jsonify({"error": "Word already in favorites"}), 409

    except Exception as e:
        # Check if it's a unique constraint error
        if "duplicate key" in str(e).lower() or "unique" in str(e).lower():
            return jsonify({"error": "Word already in favorites"}), 409
        return jsonify({"error": f"Failed to add favorite word: {str(e)}"}), 500


@app.route("/api/favorite-words/<word>", methods=["DELETE"])
@require_auth
async def remove_favorite_word(word: str):
    """
    Remove a word from the authenticated user's favorites.

    Path parameters:
        word: string (the word to remove)

    Headers:
        Authorization: Bearer <jwt_token>

    Response:
        Empty 204 No Content on success
    """
    try:
        user_id = request.user.id
        word = word.strip().lower()

        # Delete the word
        response = supabase.table("favorite_words").delete().eq(
            "user_id", user_id
        ).eq("word", word).execute()

        return "", 204

    except Exception as e:
        return jsonify({"error": f"Failed to remove favorite word: {str(e)}"}), 500


@app.route("/api/random-phrase", methods=["POST"])
@require_auth
async def get_random_phrase():
    """
    Generate a random phrase based on provided words and user context.

    Request body:
        {
            "words": ["word1", "word2", ...]
        }

    Headers:
        Authorization: Bearer <jwt_token>

    Response:
        {
            "phrase": "generated phrase",
            "words_used": ["word1", "word2"]
        }
    """
    try:
        # Get words from request body
        data = request.get_json()

        if not data or "words" not in data:
            return jsonify({"error": "Request body must include 'words' array"}), 400

        words = data.get("words", [])

        if not isinstance(words, list) or len(words) == 0:
            return jsonify({"error": "'words' must be a non-empty array"}), 400

        # Get user context from Supabase
        user_id = request.user.id
        user_context = await get_user_context(user_id)

        # Generate the phrase
        result = await generate_random_phrase(words, user_context or "")

        return jsonify(result.model_dump()), 200

    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


if __name__ == "__main__":
    # Run the Flask app
    port = int(os.getenv("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=False)
