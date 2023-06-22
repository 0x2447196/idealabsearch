'use client'

import Image from 'next/image'
import data from "./data/idealabs.json";
import { create, insertMultiple, search } from '@orama/orama'
import { persist, restore } from '@orama/plugin-data-persistence'
import { useEffect, useRef, useState } from 'react';
import { afterInsert as highlightAfterInsert, searchWithHighlight } from '@orama/plugin-match-highlight'

async function createDB() {
  const db = await create({
    schema: {
      product: 'string',
      description: 'string',
      ingredients: 'string[]'
    },
    components: {
      // Register the hook
      afterInsert: [highlightAfterInsert]
    }
  })

  await insertMultiple(db, data, 500)

  return db;
}



export default function Home() {
  const db = useRef()
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadDb() {
      db.current = await createDB();
      console.log(db.current)
    }

    loadDb();
  }, [])

  useEffect(() => {
    async function searchDB() {
      const normalizedQuery = searchQuery.toLowerCase().trim();

      if (db.current && normalizedQuery) {
        const searchResult = await search(db.current, {
          term: normalizedQuery,
          properties: '*',
        })
        const results = await searchWithHighlight(db.current, {
          term: normalizedQuery,
          properties: '*',
        })

        console.log(results)
      }
    }

    searchDB()
  }, [db.current, searchQuery])



  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <input 
      type="text" 
      value={searchQuery}
       onChange={e => setSearchQuery(e.target.value)}
      />
    </main>
  )
}

