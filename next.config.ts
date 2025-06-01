
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // ATENÇÃO: A configuração abaixo com `hostname: '**'` permite
    // imagens de QUALQUER fonte. Isso pode ter implicações de segurança,
    // pois desabilita uma camada de proteção do Next.js contra o uso
    // do seu servidor para otimizar imagens de fontes não confiáveis.
    // A prática recomendada é listar explicitamente apenas os domínios confiáveis.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Permite qualquer hostname
      },
      // Você pode remover ou comentar os padrões específicos abaixo,
      // pois o padrão curinga '**' já cobre todos eles.
      // Mantendo-os aqui não causa problemas, mas são redundantes.
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.bing.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'th.bing.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.wook.pt',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
