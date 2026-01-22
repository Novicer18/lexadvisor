import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  Upload,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Trash2,
  Eye,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type LegalDomain = 'criminal' | 'civil' | 'corporate' | 'constitutional' | 'labor' | 'tax' | 'property' | 'family' | 'environmental' | 'intellectual_property' | 'general';

interface Document {
  id: string;
  title: string;
  description: string | null;
  domain: LegalDomain;
  jurisdiction: string | null;
  year: number | null;
  tags: string[] | null;
  validated: boolean;
  created_at: string;
}

const DOMAINS: { value: LegalDomain; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'criminal', label: 'Criminal Law' },
  { value: 'civil', label: 'Civil Law' },
  { value: 'corporate', label: 'Corporate Law' },
  { value: 'constitutional', label: 'Constitutional Law' },
  { value: 'labor', label: 'Labor Law' },
  { value: 'tax', label: 'Tax Law' },
  { value: 'property', label: 'Property Law' },
  { value: 'family', label: 'Family Law' },
  { value: 'environmental', label: 'Environmental Law' },
  { value: 'intellectual_property', label: 'Intellectual Property' },
];

export default function Documents() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDomain, setFilterDomain] = useState<string>('all');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Upload form state
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadDomain, setUploadDomain] = useState<LegalDomain>('general');
  const [uploadJurisdiction, setUploadJurisdiction] = useState('');
  const [uploadYear, setUploadYear] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadContent, setUploadContent] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    const { data, error } = await supabase
      .from('legal_documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
      return;
    }

    setDocuments(data as Document[] || []);
  };

  const handleUpload = async () => {
    if (!user || !uploadTitle || !uploadContent) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in title and content.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    const { error } = await supabase.from('legal_documents').insert({
      title: uploadTitle,
      description: uploadDescription || null,
      content: uploadContent,
      domain: uploadDomain,
      jurisdiction: uploadJurisdiction || null,
      year: uploadYear ? parseInt(uploadYear) : null,
      tags: uploadTags ? uploadTags.split(',').map((t) => t.trim()) : null,
      uploaded_by: user.id,
      validated: role === 'admin',
    });

    if (error) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
      setIsUploading(false);
      return;
    }

    toast({
      title: 'Document uploaded',
      description: role === 'admin' 
        ? 'Document has been added and validated.'
        : 'Document has been added and is pending validation.',
    });

    // Reset form
    setUploadTitle('');
    setUploadDescription('');
    setUploadDomain('general');
    setUploadJurisdiction('');
    setUploadYear('');
    setUploadTags('');
    setUploadContent('');
    setIsUploadOpen(false);
    setIsUploading(false);

    fetchDocuments();
  };

  const handleValidate = async (id: string) => {
    if (role !== 'admin' && role !== 'legal_analyst') return;

    const { error } = await supabase
      .from('legal_documents')
      .update({ validated: true, validated_by: user?.id })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Validation failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Document validated',
      description: 'The document is now available for AI responses.',
    });

    fetchDocuments();
  };

  const handleDelete = async (id: string) => {
    if (role !== 'admin') return;

    const { error } = await supabase.from('legal_documents').delete().eq('id', id);

    if (error) {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Document deleted',
    });

    fetchDocuments();
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDomain = filterDomain === 'all' || doc.domain === filterDomain;
    return matchesSearch && matchesDomain;
  });

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b border-border bg-card p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-serif font-bold text-foreground">Legal Documents</h1>
                <p className="text-muted-foreground">Manage and validate legal documents for AI retrieval</p>
              </div>

              <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Upload className="h-4 w-4" />
                    Upload Document
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="font-serif">Upload Legal Document</DialogTitle>
                    <DialogDescription>
                      Add a new legal document to the knowledge base.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        placeholder="Document title"
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Brief description of the document"
                        value={uploadDescription}
                        onChange={(e) => setUploadDescription(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="domain">Legal Domain</Label>
                        <Select value={uploadDomain} onValueChange={(v) => setUploadDomain(v as LegalDomain)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DOMAINS.map((d) => (
                              <SelectItem key={d.value} value={d.value}>
                                {d.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="jurisdiction">Jurisdiction</Label>
                        <Input
                          id="jurisdiction"
                          placeholder="e.g., United States"
                          value={uploadJurisdiction}
                          onChange={(e) => setUploadJurisdiction(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="year">Year</Label>
                        <Input
                          id="year"
                          type="number"
                          placeholder="e.g., 2024"
                          value={uploadYear}
                          onChange={(e) => setUploadYear(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tags">Tags (comma-separated)</Label>
                        <Input
                          id="tags"
                          placeholder="e.g., contract, employment"
                          value={uploadTags}
                          onChange={(e) => setUploadTags(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="content">Document Content *</Label>
                      <Textarea
                        id="content"
                        placeholder="Paste the full text of the legal document..."
                        className="min-h-[200px]"
                        value={uploadContent}
                        onChange={(e) => setUploadContent(e.target.value)}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleUpload} disabled={isUploading}>
                      {isUploading ? 'Uploading...' : 'Upload Document'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={filterDomain} onValueChange={setFilterDomain}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by domain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Domains</SelectItem>
                  {DOMAINS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Documents list */}
        <ScrollArea className="flex-1">
          <div className="max-w-6xl mx-auto p-6">
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No documents found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || filterDomain !== 'all'
                    ? 'Try adjusting your search or filters.'
                    : 'Upload your first legal document to get started.'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredDocuments.map((doc) => (
                  <Card key={doc.id} className="shadow-card">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="font-serif text-lg truncate">{doc.title}</CardTitle>
                            {doc.validated ? (
                              <Badge variant="outline" className="gap-1 bg-success/10 text-success border-success/20">
                                <CheckCircle className="h-3 w-3" />
                                Validated
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 bg-warning/10 text-warning border-warning/20">
                                <Clock className="h-3 w-3" />
                                Pending
                              </Badge>
                            )}
                          </div>
                          <CardDescription className="line-clamp-2">
                            {doc.description || 'No description provided'}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          {!doc.validated && (role === 'admin' || role === 'legal_analyst') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleValidate(doc.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Validate
                            </Button>
                          )}
                          {role === 'admin' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(doc.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">
                          {DOMAINS.find((d) => d.value === doc.domain)?.label || doc.domain}
                        </Badge>
                        {doc.jurisdiction && (
                          <Badge variant="outline">{doc.jurisdiction}</Badge>
                        )}
                        {doc.year && (
                          <Badge variant="outline">{doc.year}</Badge>
                        )}
                        {doc.tags?.map((tag) => (
                          <Badge key={tag} variant="outline" className="bg-muted">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </AppLayout>
  );
}
