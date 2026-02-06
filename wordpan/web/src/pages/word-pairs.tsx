import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@/contexts/UserContext'
import { useWordPairs } from '@/hooks/use-word-pairs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Trash2, Edit2, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

interface FormData {
  word1: string
  word2: string
  pairType: 'synonym' | 'antonym' | 'translation' | 'related' | 'custom'
  description: string
}

interface EditingPair {
  id: string
  data: FormData
}

export default function WordPairsPage() {
  const navigate = useNavigate()
  const user = useUser()
  const {
    pairs,
    loading,
    error,
    pagination,
    fetchWordPairs,
    createWordPair,
    updateWordPair,
    deleteWordPair,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage,
  } = useWordPairs()

  const [showForm, setShowForm] = useState(false)
  const [editingPair, setEditingPair] = useState<EditingPair | null>(null)
  const [formData, setFormData] = useState<FormData>({
    word1: '',
    word2: '',
    pairType: 'custom',
    description: '',
  })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login')
    }
  }, [user, navigate])

  // Load word pairs on mount
  useEffect(() => {
    if (user) {
      fetchWordPairs(1, 20)
    }
  }, [user, fetchWordPairs])

  const handleFormChange = (
    field: keyof FormData,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const resetForm = () => {
    setFormData({
      word1: '',
      word2: '',
      pairType: 'custom',
      description: '',
    })
    setEditingPair(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    if (!formData.word1.trim() || !formData.word2.trim()) {
      toast.error('Both words are required')
      return
    }

    try {
      if (editingPair) {
        // Update existing pair
        await updateWordPair(editingPair.id, {
          word1: formData.word1,
          word2: formData.word2,
          pair_type: formData.pairType,
          description: formData.description,
        })
        toast.success('Word pair updated successfully')
      } else {
        // Create new pair
        await createWordPair(
          formData.word1,
          formData.word2,
          formData.pairType,
          formData.description
        )
        toast.success('Word pair created successfully')
      }

      setShowForm(false)
      resetForm()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      toast.error(message)
    }
  }

  const handleEdit = (pair: (typeof pairs)[0]) => {
    setEditingPair({
      id: pair.id,
      data: {
        word1: pair.word1,
        word2: pair.word2,
        pairType: pair.pair_type as FormData['pairType'],
        description: pair.description || '',
      },
    })
    setFormData({
      word1: pair.word1,
      word2: pair.word2,
      pairType: pair.pair_type as FormData['pairType'],
      description: pair.description || '',
    })
    setShowForm(true)
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return

    try {
      await deleteWordPair(deleteConfirm)
      toast.success('Word pair deleted successfully')
      setDeleteConfirm(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete'
      toast.error(message)
    }
  }

  const handleAddNew = () => {
    resetForm()
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    resetForm()
  }

  const getPairTypeColor = (type: string) => {
    switch (type) {
      case 'synonym':
        return 'bg-blue-100 text-blue-800'
      case 'antonym':
        return 'bg-red-100 text-red-800'
      case 'translation':
        return 'bg-green-100 text-green-800'
      case 'related':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Word Pairs</h1>
          <p className="text-gray-500">Manage your custom word pairs and relationships</p>
        </div>
        <Button onClick={handleAddNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Word Pair
        </Button>
      </div>

      {/* Form Card */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingPair ? 'Edit Word Pair' : 'Create New Word Pair'}</CardTitle>
            <CardDescription>
              {editingPair
                ? 'Update the word pair details'
                : 'Add a new relationship between two words'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="word1">Word 1</Label>
                  <Input
                    id="word1"
                    placeholder="First word"
                    value={formData.word1}
                    onChange={(e) => handleFormChange('word1', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="word2">Word 2</Label>
                  <Input
                    id="word2"
                    placeholder="Second word"
                    value={formData.word2}
                    onChange={(e) => handleFormChange('word2', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pair-type">Relationship Type</Label>
                <Select
                  value={formData.pairType}
                  onValueChange={(value) =>
                    handleFormChange('pairType', value as FormData['pairType'])
                  }
                >
                  <SelectTrigger id="pair-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="synonym">Synonym</SelectItem>
                    <SelectItem value="antonym">Antonym</SelectItem>
                    <SelectItem value="translation">Translation</SelectItem>
                    <SelectItem value="related">Related Word</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Add notes about this word pair..."
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : editingPair ? 'Update Pair' : 'Create Pair'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Word Pairs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Word Pairs</CardTitle>
          <CardDescription>
            {pagination.total > 0
              ? `Showing ${pairs.length} of ${pagination.total} word pairs`
              : 'No word pairs yet'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pairs.length === 0 ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <p className="text-gray-500">No word pairs created yet</p>
              <Button onClick={handleAddNew}>Create Your First Pair</Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Word 1</TableHead>
                    <TableHead>Word 2</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pairs.map((pair) => (
                    <TableRow key={pair.id}>
                      <TableCell className="font-medium">{pair.word1}</TableCell>
                      <TableCell>{pair.word2}</TableCell>
                      <TableCell>
                        <Badge className={getPairTypeColor(pair.pair_type)}>
                          {pair.pair_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-gray-600">
                        {pair.description || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(pair.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(pair)}
                            disabled={loading}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => setDeleteConfirm(pair.id)}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-gray-500">
                  Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={prevPage}
                    disabled={!hasPrevPage || loading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={nextPage}
                    disabled={!hasNextPage || loading}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Word Pair?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The word pair will be permanently deleted.
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
