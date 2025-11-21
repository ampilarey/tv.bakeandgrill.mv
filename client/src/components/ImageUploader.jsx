/**
 * Image Uploader Component
 * Upload and manage images for slides
 * Phase 2: Images & QR Codes
 */
import { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import api from '../services/api';
import Button from './common/Button';
import Spinner from './common/Spinner';

function ImageUploader({ onUploadSuccess, onError, maxSizeMB = 10, accept = 'image/*' }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      if (onError) {
        onError(`File too large. Maximum size is ${maxSizeMB}MB.`);
      }
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      if (onError) {
        onError('Please select an image file.');
      }
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await api.post('/uploads/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percentCompleted);
        }
      });

      if (response.data.success) {
        if (onUploadSuccess) {
          onUploadSuccess(response.data.image);
        }
        // Reset form
        setSelectedFile(null);
        setPreview(null);
        setProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      if (onError) {
        onError(error.response?.data?.message || error.message || 'Failed to upload image');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreview(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer.files?.[0];
    if (file) {
      // Trigger file select with dropped file
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
        handleFileSelect({ target: { files: dataTransfer.files } });
      }
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      {!selectedFile && (
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className="space-y-2">
            <div className="text-4xl">📸</div>
            <p className="text-lg font-medium text-gray-700">
              Click to upload or drag and drop
            </p>
            <p className="text-sm text-gray-500">
              PNG, JPG, WEBP up to {maxSizeMB}MB
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Preview & Upload */}
      {selectedFile && preview && (
        <div className="space-y-4">
          <div className="border rounded-lg overflow-hidden bg-gray-50">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-64 object-contain"
            />
          </div>

          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {selectedFile.name}
              </p>
              <p className="text-sm text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-center text-gray-600">
                Uploading... {progress}%
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1"
            >
              {uploading ? (
                <>
                  <Spinner size="sm" />
                  Uploading...
                </>
              ) : (
                'Upload Image'
              )}
            </Button>
            <Button
              onClick={handleCancel}
              variant="secondary"
              disabled={uploading}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

ImageUploader.propTypes = {
  onUploadSuccess: PropTypes.func,
  onError: PropTypes.func,
  maxSizeMB: PropTypes.number,
  accept: PropTypes.string
};

export default ImageUploader;

