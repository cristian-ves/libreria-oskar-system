const env = require('../config/env');

/** Nombre de autor canónico cuando ningún proveedor externo aporta autores reales. */
const AUTOR_PLACEHOLDER = 'Autor de Biblioteca Internacional';

// Catálogo bibliográfico de referencia para contingencia / modo sin cuota
const FALLBACK_CATALOG = {
  '9780132350884': {
    isbn: '9780132350884',
    titulo: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    autor: 'Robert C. Martin',
    editorial: 'Prentice Hall',
    resena: 'Even bad code can function. But if code isn\'t clean, it can bring a development organization to its knees. A handbook of agile software craftsmanship.',
    imagen_url: 'https://images.isbndb.com/covers/08/84/9780132350884.jpg',
    precio: 45.99,
    fuente: 'Catálogo Bibliográfico de Respaldo',
  },
  '9780135957059': {
    isbn: '9780135957059',
    titulo: 'The Pragmatic Programmer: Your Journey To Mastery (20th Anniversary Edition)',
    autor: 'David Thomas, Andrew Hunt',
    editorial: 'Addison-Wesley Professional',
    resena: 'The Pragmatic Programmer cuts through the increasing specialization and technicalities of modern software development to examine the core process.',
    imagen_url: 'https://images.isbndb.com/covers/70/59/9780135957059.jpg',
    precio: 49.99,
    fuente: 'Catálogo Bibliográfico de Respaldo',
  },
  '9788424116286': {
    isbn: '9788424116286',
    titulo: 'Don Quijote de la Mancha',
    autor: 'Miguel de Cervantes Saavedra',
    editorial: 'Editorial Everest',
    resena: 'La obra cumbre de la literatura en lengua española que relata las aventuras del ingenioso hidalgo Don Quijote de la Mancha.',
    imagen_url: null,
    precio: 18.50,
    fuente: 'Catálogo Bibliográfico de Respaldo',
  },
  '9780307474728': {
    isbn: '9780307474728',
    titulo: 'Cien años de soledad',
    autor: 'Gabriel García Márquez',
    editorial: 'Vintage Español',
    resena: 'Una de las obras maestras de la literatura universal que relata la historia de la familia Buendía en el pueblo mítico de Macondo.',
    imagen_url: null,
    precio: 15.99,
    fuente: 'Catálogo Bibliográfico de Respaldo',
  }
};

class GoogleBooksService {
  constructor() {
    this.cache = new Map();
    this.cacheTtlMs = 60 * 60 * 1000; // 1 hora de expiración en caché
  }

  /**
   * Limpia un código ISBN eliminando guiones y espacios.
   * @param {string} isbn
   * @returns {string}
   */
  normalizarIsbn(isbn) {
    if (!isbn) return '';
    return isbn.toString().replace(/[-\s]/g, '').trim();
  }

  /**
   * Consulta los detalles de un libro a través de Google Books API con timeouts controlados (3-5s),
   * estrategia de caché en memoria y fallback multinivel en caso de indisponibilidad (429, 503 o timeouts).
   * 
   * @param {string} rawIsbn - Código ISBN-10 o ISBN-13
   * @returns {Promise<{
   *   isbn: string,
   *   titulo: string,
   *   autor: string,
   *   editorial: string,
   *   resena: string,
   *   imagen_url: string | null,
   *   precio: number,
   *   fuente: string
   * } | null>}
   */
  async buscarPorIsbn(rawIsbn) {
    const isbn = this.normalizarIsbn(rawIsbn);
    if (!isbn) return null;

    // Verificar caché en memoria para optimizar cuotas y latencia (< 2s)
    const cached = this.cache.get(isbn);
    if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      return cached.data;
    }

    // 1. Intento primario: Google Books API (Timeout máx 3 segundos para respuesta ágil)
    try {
      const bookData = await this._consultarGoogleBooks(isbn, 3000);
      if (bookData) {
        this.cache.set(isbn, { timestamp: Date.now(), data: bookData });
        return bookData;
      }
    } catch (error) {
      console.warn(`[GOOGLE BOOKS API]: ${error.message}. Activando fallback resiliente...`);
    }

    // 2. Fallback secundario: OpenLibrary API (Timeout máx 3 segundos)
    try {
      const openLibraryData = await this._consultarFallbackOpenLibrary(isbn, 3000);
      if (openLibraryData) {
        this.cache.set(isbn, { timestamp: Date.now(), data: openLibraryData });
        return openLibraryData;
      }
    } catch (fallbackError) {
      console.warn(`[FALLBACK OPENLIBRARY]: ${fallbackError.message}`);
    }

    // 3. Fallback terciario: Catálogo bibliográfico de contingencia / Metadatos de respaldo
    if (FALLBACK_CATALOG[isbn]) {
      const fallbackBook = FALLBACK_CATALOG[isbn];
      this.cache.set(isbn, { timestamp: Date.now(), data: fallbackBook });
      return fallbackBook;
    }

    // Si el ISBN es válido (10 o 13 dígitos) pero ningún proveedor externo respondió:
    if (/^\d{9}[\dX]|\d{13}$/.test(isbn)) {
      const contingencyBook = {
        isbn,
        titulo: `Libro ISBN ${isbn}`,
        autor: AUTOR_PLACEHOLDER,
        editorial: 'Editorial Independiente',
        resena: `Ejemplar registrado en contingencia offline con ISBN ${isbn}. Metadatos detallados pendientes de sincronización por límite de cuota externa.`,
        imagen_url: null,
        precio: 0.00,
        fuente: 'Modo Contingencia Offline',
      };
      this.cache.set(isbn, { timestamp: Date.now(), data: contingencyBook });
      return contingencyBook;
    }

    return null;
  }

  /**
   * Realiza la llamada HTTP a Google Books API con timeout controlado.
   * @private
   */
  async _consultarGoogleBooks(isbn, timeoutMs = 3000) {
    const url = new URL(env.googleBooks.baseUrl);
    url.searchParams.set('q', `isbn:${isbn}`);
    if (env.googleBooks.apiKey) {
      url.searchParams.set('key', env.googleBooks.apiKey);
    }

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let parsedMsg = `HTTP ${response.status}`;
      try {
        const jsonErr = JSON.parse(errorBody);
        if (jsonErr.error && jsonErr.error.message) {
          parsedMsg += `: ${jsonErr.error.message}`;
        }
      } catch {
        parsedMsg += `: ${errorBody.substring(0, 100)}`;
      }
      throw new Error(parsedMsg);
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    const volume = data.items[0];
    const info = volume.volumeInfo || {};

    const titulo = info.title || 'Título sin especificar';
    const autor = Array.isArray(info.authors) && info.authors.length > 0
      ? info.authors.join(', ')
      : AUTOR_PLACEHOLDER;
    const editorial = info.publisher || 'Editorial Desconocida';
    
    // Reseña obligatoria según el esquema relacional
    const resena = info.description
      ? info.description
      : `${titulo}. Obra publicada por ${editorial}.`;

    // Normalizar portada externa a HTTPS
    let imagen_url = null;
    if (info.imageLinks) {
      const img = info.imageLinks.thumbnail || info.imageLinks.smallThumbnail;
      if (img) {
        imagen_url = img.replace(/^http:\/\//i, 'https://');
      }
    }

    // Precio referencial
    let precio = 0.00;
    if (volume.saleInfo && volume.saleInfo.listPrice && volume.saleInfo.listPrice.amount) {
      precio = parseFloat(volume.saleInfo.listPrice.amount) || 0.00;
    }

    return {
      isbn,
      titulo: titulo.substring(0, 255),
      autor: autor.substring(0, 150),
      editorial: editorial.substring(0, 150),
      resena,
      imagen_url,
      precio: Math.max(0, precio),
      fuente: 'Google Books API',
    };
  }

  /**
   * Proveedor de respaldo secundario (OpenLibrary) en caso de cuota excedida en Google Books.
   * Resuelve autores consultando individualmente cada clave `/authors/OLxxA.json` con
   * Promise.allSettled; los fallos individuales se ignoran sin lanzar error.
   * @private
   */
  async _consultarFallbackOpenLibrary(isbn, timeoutMs = 3000) {
    const url = `https://openlibrary.org/isbn/${isbn}.json`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const titulo = data.title || 'Título no especificado';
    const editorial = Array.isArray(data.publishers) && data.publishers.length > 0
      ? data.publishers[0]
      : 'Editorial Independiente';

    // Formatear reseña
    let resena = `${titulo}. Edición catalogada en biblioteca internacional.`;
    if (typeof data.description === 'string') {
      resena = data.description;
    } else if (data.description && data.description.value) {
      resena = data.description.value;
    }

    // Portada en OpenLibrary
    let imagen_url = null;
    if (Array.isArray(data.covers) && data.covers.length > 0) {
      imagen_url = `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg`;
    }

    // Resolver autores desde claves /authors/OLxxA usando Promise.allSettled (máx 3)
    let autorResuelto = AUTOR_PLACEHOLDER;
    if (Array.isArray(data.authors) && data.authors.length > 0) {
      const claves = data.authors
        .slice(0, 3)
        .map((a) => (a && typeof a.key === 'string' ? a.key : null))
        .filter(Boolean);

      if (claves.length > 0) {
        const resultados = await Promise.allSettled(
          claves.map(async (key) => {
            const r = await fetch(`https://openlibrary.org${key}.json`, {
              signal: AbortSignal.timeout(3000),
              headers: { 'Accept': 'application/json' },
            });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const autorData = await r.json();
            return typeof autorData.name === 'string' ? autorData.name.trim() : null;
          })
        );

        const nombres = resultados
          .filter((r) => r.status === 'fulfilled' && r.value)
          .map((r) => r.value);

        if (nombres.length > 0) {
          autorResuelto = nombres.join(', ').substring(0, 150);
        }
      }
    }

    return {
      isbn,
      titulo: titulo.substring(0, 255),
      autor: autorResuelto,
      editorial: editorial.substring(0, 150),
      resena,
      imagen_url,
      precio: 0.00,
      fuente: 'OpenLibrary Fallback',
    };
  }
}

module.exports = new GoogleBooksService();
