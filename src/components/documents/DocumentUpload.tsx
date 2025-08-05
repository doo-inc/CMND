
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Trash2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Document {
  id?: string;
  name: string;
  file_path: string;
  document_type: string;
  file_size?: number;
  created_at?: string;
}

interface DocumentUploadProps {
  documents: Document[];
  onDocumentsChange: (documents: Document[]) => void;
  entityType: "customer" | "partnership";
  entityId?: string;
}

const documentTypes = [
  "Contract",
  "Invoice", 
  "Agreement",
  "Proposal",
  "SOW",
  "Other"
];

export function DocumentUpload({ 
  documents, 
  onDocumentsChange, 
  entityType, 
  entityId 
}: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload PDF or Word documents only.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload files smaller than 50MB.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      // Generate unique file path
      const timestamp = Date.now();
      const fileName = `${entityType}-${entityId || 'new'}-${timestamp}-${file.name}`;
      const filePath = `${entityType}s/${fileName}`;

      console.log('Uploading file:', { fileName, filePath, fileSize: file.size });

      // Upload to Supabase Storage - using correct bucket name
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('Customer Documents')
        .upload(filePath, file);

      console.log('Upload result:', { uploadData, uploadError });

      if (uploadError) {
        throw uploadError;
      }

      // Create document object
      const newDocument: Document = {
        name: file.name,
        file_path: filePath,
        document_type: "Other", // Default type, user can change
        file_size: file.size
      };

      // Add to documents list
      onDocumentsChange([...documents, newDocument]);

      toast({
        title: "File uploaded successfully",
        description: `${file.name} has been uploaded.`
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your file.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const updateDocumentType = (index: number, type: string) => {
    const updatedDocuments = [...documents];
    updatedDocuments[index].document_type = type;
    onDocumentsChange(updatedDocuments);
  };

  const removeDocument = async (index: number) => {
    const doc = documents[index];
    
    try {
      // Delete from Supabase Storage
      const { error } = await supabase.storage
        .from('Customer Documents')
        .remove([doc.file_path]);

      if (error) {
        console.error('Error deleting file:', error);
      }

      // Remove from documents list
      const updatedDocuments = documents.filter((_, i) => i !== index);
      onDocumentsChange(updatedDocuments);

      toast({
        title: "Document removed",
        description: `${doc.name} has been removed.`
      });

    } catch (error) {
      console.error('Error removing document:', error);
      toast({
        title: "Error",
        description: "Failed to remove document.",
        variant: "destructive"
      });
    }
  };

  const downloadDocument = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('Customer Documents')
        .download(doc.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = doc.name;
      window.document.body.appendChild(anchor);
      anchor.click();
      window.document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "There was an error downloading the file.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <div className="space-y-2">
          <p className="text-lg font-medium">
            {isUploading ? 'Uploading...' : 'Drop files here or click to upload'}
          </p>
          <p className="text-sm text-gray-500">
            PDF and Word documents up to 50MB
          </p>
          <Input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            disabled={isUploading}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            Choose Files
          </Button>
        </div>
      </div>

      {/* Documents List */}
      {documents.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Uploaded Documents</Label>
          {documents.map((doc, index) => (
            <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
              <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.name}</p>
                {doc.file_size && (
                  <p className="text-xs text-gray-500">
                    {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                  </p>
                )}
              </div>

              <Select
                value={doc.document_type}
                onValueChange={(value) => updateDocumentType(index, value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => downloadDocument(doc)}
              >
                <Download className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeDocument(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
