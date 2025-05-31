'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { BookSchema, type BookFormData } from '@/lib/schemas';
import type { Book } from '@/lib/types';
import { BOOK_GENRES } from '@/lib/constants';
import { Loader2, Save } from 'lucide-react';

interface BookFormProps {
  onSubmit: (data: BookFormData) => Promise<void>; // Changed from Book to BookFormData
  initialData?: Book | null;
  onCancel: () => void;
}

export function BookForm({ onSubmit, initialData, onCancel }: BookFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<BookFormData>({
    resolver: zodResolver(BookSchema),
    defaultValues: initialData ? {
      title: initialData.title,
      author: initialData.author,
      isbn: initialData.isbn,
      genre: initialData.genre,
      publicationYear: initialData.publicationYear,
      coverImageUrl: initialData.coverImageUrl || '',
    } : {
      title: '',
      author: '',
      isbn: '',
      genre: '',
      publicationYear: new Date().getFullYear(),
      coverImageUrl: '',
    },
  });

  const handleFormSubmit = async (data: BookFormData) => {
    setIsLoading(true);
    await onSubmit(data); // Pass BookFormData directly
    setIsLoading(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 p-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: O Pequeno Príncipe" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="author"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Autor</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Antoine de Saint-Exupéry" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
            control={form.control}
            name="isbn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ISBN</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: 978-3-16-148410-0" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="genre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gênero</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um gênero" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {BOOK_GENRES.map((genre) => (
                      <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="publicationYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ano de Publicação</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Ex: 2023" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
            control={form.control}
            name="coverImageUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL da Imagem da Capa (Opcional)</FormLabel>
                <FormControl>
                  <Input type="url" placeholder="https://example.com/cover.jpg" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Livro
          </Button>
        </div>
      </form>
    </Form>
  );
}
