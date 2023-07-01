'use client'

import data from "./data/idealabs.json";
import { create, insertMultiple, search, Results, Result } from '@orama/orama'
// import { persist, restore } from '@orama/plugin-data-persistence'
import { useEffect, useRef, useState } from 'react';
import { Position, OramaWithHighlight, afterInsert as highlightAfterInsert, searchWithHighlight } from '@orama/plugin-match-highlight'

interface FixedHighlightedResult extends Result {
  positions: Record<string, Record<string, Position[]>>
}

interface FixedHighlightedResults extends Results {
  hits: FixedHighlightedResult[]
}

async function createDB() {
  const db = await create({
    schema: {
      product: 'string',
      description: 'string',
      ingredients: 'string'
    },
    components: {
      // Register the hook
      afterInsert: [highlightAfterInsert]
    }
  })

  const searchData = data.map(d => ({
    ...d,
    ingredients: d.ingredients.join(", ")
  }))

  await insertMultiple(db, searchData, 500)

  return db as OramaWithHighlight;
}


const HighlightedSearchResult = ({ original, matches }: {
  original: string;
  matches: Record<string, Position[]>
}) => {

  const resultString = Object.keys(matches)[0];
  const highlights = matches[resultString];

  if (!highlights) { return original }

  let currentIndex = 0;
  let parts = [];

  highlights.forEach((highlight) => {
    const { start, length } = highlight;
    const normal = original.slice(currentIndex, start);
    const highlighted = original.slice(start, start + length);

    parts.push(<span>{normal}</span>);
    parts.push(<span style={{ backgroundColor: 'yellow' }}>{highlighted}</span>);

    currentIndex = start + length;
  });

  // Add the remaining text, if any
  if (currentIndex < original.length) {
    const remaining = original.slice(currentIndex);
    parts.push(<span>{remaining}</span>);
  }

  return <>{parts}</>;
};



export default function Home() {
  const db = useRef<OramaWithHighlight>()
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FixedHighlightedResults>();
  const [isSearchBlankQuery, setIsSearchBlankQuery] = useState(true);

  useEffect(() => {
    async function loadDb() {
      db.current = await createDB();
    }

    loadDb();
  }, [])

  useEffect(() => {
    async function searchDB() {
      const normalizedQuery = searchQuery.toLowerCase().trim();

      if (db.current && normalizedQuery) {
        const results = await searchWithHighlight(db.current, {
          term: normalizedQuery,
          properties: ['product', 'ingredients', 'description'],
        })
        setIsSearchBlankQuery(false)
        setSearchResults(results as unknown as FixedHighlightedResults)

      } else {
        setIsSearchBlankQuery(true)
      }
    }

    searchDB()
  }, [db.current, searchQuery])



  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 bg-white p-2">
        <div className="max-w-3xl mx-auto">
        <h1 className="font-bold inline-block mr-2 mb-1">IdeaLabs Search</h1>

          <input 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full p-2 mb-4 border rounded"
            placeholder="start typing something..."
          />
        </div>
      </div>
  
      <main className="max-w-3xl mx-auto py-4 mt-20">
        <div className="w-full divide-y divide-gray-200">
          <div className="flex bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-6">
            <div className="flex-1">Product</div>
            <div className="flex-1">Ingredients</div>
            <div className="flex-1">Description</div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {isSearchBlankQuery && data.map((result) => (
              <div key={result.product} className="flex bg-white p-6">
                <div className="flex-1 whitespace-normal overflow-auto">{result.product}</div>
                <div className="flex-1 whitespace-normal overflow-auto">{result.ingredients.join(", ")}</div>
                <div className="flex-1 whitespace-normal overflow-auto">
                  <div className="max-h-56 overflow-y-scroll">{result.description}</div>
                </div>
              </div>
            ))}
  
            {searchResults?.hits.map((result) =>  (
              <div key={result.id} className="flex bg-white p-6">
                <div className="flex-1 whitespace-normal overflow-auto">
                  <HighlightedSearchResult original={result.document.product as string} matches={result.positions.product} />
                </div>
                <div className="flex-1 whitespace-normal overflow-auto">
                  <HighlightedSearchResult original={result.document.ingredients as string} matches={result.positions.ingredients} />
                </div>
                <div className="flex-1 whitespace-normal overflow-auto">
                  <div className="max-h-56 overflow-y-scroll">
                    <HighlightedSearchResult original={result.document.description as string} matches={result.positions.description} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  )
  
}

