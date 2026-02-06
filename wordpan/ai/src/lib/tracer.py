import os
import asyncio
import functools
import uuid
from typing import Callable, TypeVar, ParamSpec

from openinference.instrumentation import using_session
from openinference.semconv.trace import SpanAttributes
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace.export import SimpleSpanProcessor

PROJECT_NAME = os.getenv("PHOENIX_PROJECT_NAME")
PHOENIX_COLLECTOR_ENDPOINT = os.getenv("PHOENIX_COLLECTOR_ENDPOINT")

# Setup Phoenix tracer provider (optional - only if Phoenix is available)
tracer_provider = None

def setup_phoenix_tracing():
    """
    Lazily initialize Phoenix tracing only when needed.
    This avoids importing the heavy phoenix package on startup.
    """
    global tracer_provider
    if tracer_provider is not None:
        return
    
    try:
        from phoenix.otel import register
        from openinference.instrumentation.crewai import CrewAIInstrumentor
        from openinference.instrumentation.litellm import LiteLLMInstrumentor
        
        tracer_provider = register(project_name=PROJECT_NAME, set_global_tracer_provider=False)
        tracer_provider.add_span_processor(SimpleSpanProcessor(OTLPSpanExporter(PHOENIX_COLLECTOR_ENDPOINT)))
        CrewAIInstrumentor().instrument(tracer_provider=tracer_provider)
        LiteLLMInstrumentor().instrument(tracer_provider=tracer_provider)
        print(f"✓ Phoenix tracing initialized for project: {PROJECT_NAME}")
    except Exception as e:
        print(f"⚠ Phoenix tracing not available ({str(e)}). Continuing without tracing.")
        tracer_provider = None

# Get tracer (without Phoenix setup yet - it's lazy-loaded)
tracer = trace.get_tracer(__name__)

P = ParamSpec('P')
T = TypeVar('T')

def traceable(func: Callable[P, T]) -> Callable[P, T]:
    """
    A decorator that sets up tracing for test functions.
    It creates a new trace session and span for each test execution.

    Usage:
        @traceable
        def test_something():
            # Your test code here
            pass

        @traceable
        async def test_something_async():
            # Your async test code here
            pass
    """
    @functools.wraps(func)
    def sync_wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
        session_id = str(uuid.uuid4())

        with tracer.start_as_current_span(
                name=func.__name__,
                attributes={
                    SpanAttributes.OPENINFERENCE_SPAN_KIND: "agent",
                    SpanAttributes.SESSION_ID: session_id
                }
            ) as span:
            with using_session(session_id):
                result = func(*args, **kwargs)
                return result

    @functools.wraps(func)
    async def async_wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
        session_id = str(uuid.uuid4())

        with tracer.start_as_current_span(
            name=func.__name__,
            attributes={
                SpanAttributes.OPENINFERENCE_SPAN_KIND: "agent",
                SpanAttributes.SESSION_ID: session_id
            }
        ) as span:
            with using_session(session_id):
                result = await func(*args, **kwargs)
                return result

    return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper

__all__ = ["traceable", "tracer"]
