'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { formsAPI, submissionsAPI, uploadAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { Upload, CheckCircle } from 'lucide-react';

interface FormField {
  id: string;
  type: string;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    acceptedTypes?: string[];
  };
  options?: string[];
  defaultValue?: string | number | boolean;
}

interface Form {
  _id: string;
  title: string;
  description?: string;
  schema: FormField[];
}

export default function PublicFormPage() {
  const params = useParams();
  const shareableId = params.shareableId as string;
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [imageFiles, setImageFiles] = useState<Record<string, File>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    loadForm();
  }, [shareableId]);

  const loadForm = async () => {
    try {
      const response = await formsAPI.getByShareableId(shareableId);
      setForm(response.data.form);
      
      // Initialize form data with default values
      const initialData: Record<string, any> = {};
      response.data.form.schema.forEach((field: FormField) => {
        if (field.defaultValue !== undefined) {
          initialData[field.name] = field.defaultValue;
        } else if (field.type === 'checkbox') {
          initialData[field.name] = [];
        }
      });
      setFormData(initialData);
    } catch (error: any) {
      toast.error('Form not found');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (name: string, value: any) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (name: string, file: File | null) => {
    if (file) {
      setImageFiles({ ...imageFiles, [name]: file });
    } else {
      const newFiles = { ...imageFiles };
      delete newFiles[name];
      setImageFiles(newFiles);
    }
  };

  const validateForm = (): boolean => {
    if (!form) return false;

    for (const field of form.schema) {
      if (field.required) {
        const value = formData[field.name];
        if (!value || (Array.isArray(value) && value.length === 0)) {
          toast.error(`${field.label} is required`);
          return false;
        }

        // Additional validation
        if (field.validation) {
          if (field.validation.minLength && String(value).length < field.validation.minLength) {
            toast.error(`${field.label} must be at least ${field.validation.minLength} characters`);
            return false;
          }
          if (field.validation.maxLength && String(value).length > field.validation.maxLength) {
            toast.error(`${field.label} must be at most ${field.validation.maxLength} characters`);
            return false;
          }
          if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            toast.error('Please enter a valid email address');
            return false;
          }
        }
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form || !validateForm()) return;

    setSubmitting(true);

    try {
      // Upload images first
      const imageUrls: string[] = [];
      for (const [fieldName, file] of Object.entries(imageFiles)) {
        const url = await uploadAPI.uploadImage(file);
        imageUrls.push(url);
        // Store URL in form data
        formData[fieldName] = url;
      }

      // Submit form
      await submissionsAPI.submit(form._id, formData, imageUrls);
      setSubmitted(true);
      toast.success('Form submitted successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.name] || '';

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
      case 'date':
        return (
          <input
            type={field.type}
            id={field.id}
            name={field.name}
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            min={field.validation?.min}
            max={field.validation?.max}
            minLength={field.validation?.minLength}
            maxLength={field.validation?.maxLength}
            pattern={field.validation?.pattern}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        );

      case 'textarea':
        return (
          <textarea
            id={field.id}
            name={field.name}
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            minLength={field.validation?.minLength}
            maxLength={field.validation?.maxLength}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          />
        );

      case 'select':
        return (
          <select
            id={field.id}
            name={field.name}
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            required={field.required}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">Select an option</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label key={option} className="flex items-center">
                <input
                  type="radio"
                  name={field.name}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  required={field.required}
                  className="mr-2"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        const checkboxValue = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label key={option} className="flex items-center">
                <input
                  type="checkbox"
                  value={option}
                  checked={checkboxValue.includes(option)}
                  onChange={(e) => {
                    const newValue = e.target.checked
                      ? [...checkboxValue, option]
                      : checkboxValue.filter((v) => v !== option);
                    handleInputChange(field.name, newValue);
                  }}
                  className="mr-2"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );

      case 'file':
        return (
          <div>
            <label className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg cursor-pointer transition-colors inline-block">
              <Upload className="w-5 h-5" />
              {imageFiles[field.name] ? imageFiles[field.name].name : 'Choose Image'}
              <input
                type="file"
                accept={field.validation?.acceptedTypes?.join(',') || 'image/*'}
                onChange={(e) => handleFileChange(field.name, e.target.files?.[0] || null)}
                required={field.required}
                className="hidden"
              />
            </label>
            {imageFiles[field.name] && (
              <img
                src={URL.createObjectURL(imageFiles[field.name])}
                alt="Preview"
                className="mt-2 w-32 h-32 object-cover rounded-lg"
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Form not found</h1>
          <p className="text-gray-600">The form you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank you!</h2>
          <p className="text-gray-600">Your submission has been received successfully.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{form.title}</h1>
        {form.description && (
          <p className="text-gray-600 mb-8">{form.description}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {form.schema.map((field) => (
            <div key={field.id}>
              <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-2">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {renderField(field)}
            </div>
          ))}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
}

