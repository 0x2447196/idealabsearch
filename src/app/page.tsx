'use client'

import Image from 'next/image'
import data from "./data/idealabs.json";
import { create, insertMultiple, search } from '@orama/orama'
import { persist, restore } from '@orama/plugin-data-persistence'
import { useEffect, useRef, useState } from 'react';
import { SearchResultWithHighlight, afterInsert as highlightAfterInsert, searchWithHighlight } from '@orama/plugin-match-highlight'

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

  return db;
}


const HighlightedSearchResult = ({ matches, original }) => {
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
  const db = useRef()
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultWithHighlight>();
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
        setSearchResults(results)

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
      <h1 className="font-bold">IdeaLabs Search</h1>
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
      <table className="w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Product
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ingredients
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
        {isSearchBlankQuery && data.map((result) => (
            <tr key={result.product}>
              <td className="px-6 py-4  whitespace-normal overflow-auto align-top">
                {result.product}
              </td>
              <td className="px-6 py-4  whitespace-normal overflow-auto align-top">
                {result.ingredients.join(", ")}
              </td>
              <td className="px-6 py-4  whitespace-normal overflow-auto align-top">
                <div className="max-h-56 overflow-y-scroll">
                {result.description}
                </div>
              </td>
            </tr>
          ))}
          {searchResults?.hits.map((result) => (
            <tr key={result.id}>
              <td className="px-6 py-4  whitespace-normal overflow-auto align-top">
                <HighlightedSearchResult original={result.document.product} matches={result.positions.product} />
              </td>
              <td className="px-6 py-4  whitespace-normal overflow-auto align-top">
                <HighlightedSearchResult original={result.document.ingredients} matches={result.positions.ingredients} />
              </td>
              <td className="px-6 py-4  whitespace-normal overflow-auto align-top">
                <div className="max-h-56 overflow-y-scroll">
                <HighlightedSearchResult original={result.document.description} matches={result.positions.description} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
    </>

  )  
}

