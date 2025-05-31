'use client';

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, X } from "lucide-react";
import { BOOK_GENRES, BOOK_STATUS_OPTIONS } from "@/lib/constants";

export interface BookFiltersState {
  searchTerm: string;
  genre: string;
  status: string;
}

interface BookFiltersProps {
  filters: BookFiltersState;
  onFiltersChange: (newFilters: BookFiltersState) => void;
  onClearFilters: () => void;
}

export function BookFilters({ filters, onFiltersChange, onClearFilters }: BookFiltersProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, searchTerm: e.target.value });
  };

  const handleSelectChange = (field: 'genre' | 'status') => (value: string) => {
    onFiltersChange({ ...filters, [field]: value === 'Todos' ? '' : value });
  };

  return (
    <Card className="mb-6 shadow">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="space-y-1">
            <label htmlFor="searchTerm" className="text-sm font-medium text-muted-foreground">Buscar</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="searchTerm"
                placeholder="Título, autor, ISBN..."
                value={filters.searchTerm}
                onChange={handleInputChange}
                className="pl-9"
              />
            </div>
          </div>
          
          <div className="space-y-1">
            <label htmlFor="genre" className="text-sm font-medium text-muted-foreground">Gênero</label>
            <Select value={filters.genre || 'Todos'} onValueChange={handleSelectChange('genre')}>
              <SelectTrigger id="genre">
                <SelectValue placeholder="Selecionar gênero" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos os Gêneros</SelectItem>
                {BOOK_GENRES.map((genre) => (
                  <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label htmlFor="status" className="text-sm font-medium text-muted-foreground">Status</label>
            <Select value={filters.status || 'Todos'} onValueChange={handleSelectChange('status')}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Selecionar status" />
              </SelectTrigger>
              <SelectContent>
                {BOOK_STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button onClick={onClearFilters} variant="outline" className="w-full md:w-auto">
            <X className="mr-2 h-4 w-4" /> Limpar Filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
