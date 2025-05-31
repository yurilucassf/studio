'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, Loader2, Send } from 'lucide-react';
// Assuming the Genkit flows are available. This is a client component.
// For server-side Genkit calls, you'd use Server Actions.
// For this example, we'll simulate a client-side interaction pattern.
// import { generateBookRecommendations } from '@/ai/flows/book-recommendation';
// import { summarizeCatalog } from '@/ai/flows/catalog-summary';

export default function RecomendacoesPage() {
  const [preferences, setPreferences] = useState('');
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  const handleGetRecommendations = async () => {
    if (!preferences.trim()) {
      alert("Por favor, descreva suas preferências ou histórico de leitura.");
      return;
    }
    setIsLoadingRecommendations(true);
    setRecommendations([]);
    try {
      // const result = await generateBookRecommendations({ readingHistory: preferences });
      // setRecommendations(result.recommendations);
      // Mock AI call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setRecommendations([
        "Mock: O Guia do Mochileiro das Galáxias - Douglas Adams",
        "Mock: Duna - Frank Herbert",
        "Mock: Neuromancer - William Gibson"
      ]);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      alert("Erro ao buscar recomendações.");
    } finally {
      setIsLoadingRecommendations(false);
    }
  };
  
  const handleSummarizeCatalog = async () => {
    const filtersForSummary = "livros de ficção científica e fantasia publicados nos últimos 5 anos"; // Example filter
    setIsLoadingSummary(true);
    setSummary('');
    try {
      // const result = await summarizeCatalog({ filters: filtersForSummary });
      // setSummary(result.summary);
      // Mock AI call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSummary(`Mock: O catálogo de ${filtersForSummary} apresenta uma vasta coleção de mundos imaginários e futuros distópicos, com autores renomados e novas vozes promissoras. Ideal para quem busca escapar da realidade e explorar novas dimensões.`);
    } catch (error) {
      console.error("Error fetching summary:", error);
      alert("Erro ao gerar resumo do catálogo.");
    } finally {
      setIsLoadingSummary(false);
    }
  };


  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-headline font-semibold text-foreground flex items-center">
        <Lightbulb className="mr-3 h-8 w-8 text-accent" />
        Recomendações de Livros (IA)
      </h1>
      <p className="text-muted-foreground">
        Descubra novos livros com base em suas preferências ou explore resumos inteligentes do nosso catálogo.
      </p>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Obter Recomendações Pessoais</CardTitle>
            <CardDescription>
              Descreva seus gêneros favoritos, autores que você gosta, ou livros que leu recentemente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Ex: Gosto de fantasia épica como 'O Senhor dos Anéis', e também ficção científica com temas filosóficos..."
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              rows={5}
              disabled={isLoadingRecommendations}
            />
            <Button onClick={handleGetRecommendations} disabled={isLoadingRecommendations || !preferences.trim()} className="w-full">
              {isLoadingRecommendations ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Buscar Recomendações
            </Button>
          </CardContent>
          {recommendations.length > 0 && (
            <CardFooter className="flex-col items-start gap-2 pt-4 border-t">
              <h3 className="font-semibold text-foreground">Sugestões para você:</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                {recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </CardFooter>
          )}
        </Card>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Resumo Inteligente do Catálogo</CardTitle>
            <CardDescription>
              Obtenha um resumo gerado por IA de uma seção específica do nosso catálogo (funcionalidade de exemplo).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSummarizeCatalog} disabled={isLoadingSummary} className="w-full">
              {isLoadingSummary ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Lightbulb className="mr-2 h-4 w-4" />
              )}
              Gerar Resumo (Ex: Ficção Científica/Fantasia Recentes)
            </Button>
          </CardContent>
          {summary && (
            <CardFooter className="flex-col items-start gap-2 pt-4 border-t">
              <h3 className="font-semibold text-foreground">Resumo Gerado:</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{summary}</p>
            </CardFooter>
          )}
        </Card>
      </div>
      
      <Card className="mt-8 bg-secondary/30 border-accent shadow">
        <CardHeader>
          <CardTitle className="text-accent flex items-center"><Lightbulb className="mr-2 h-5 w-5"/>Nota sobre IA</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Este é um espaço para demonstrar futuras integrações com Inteligência Artificial usando Genkit.
            As funcionalidades de recomendação e resumo são exemplos e podem ser expandidas e refinadas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
