import { NextApiRequest, NextApiResponse } from 'next'

import * as types from '../../lib/types'
import { search } from '../../lib/notion'

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).send({ error: 'method not allowed' })
  }

  const searchParams: types.SearchParams = req.body

  if (
    typeof searchParams?.query !== 'string' ||
    typeof searchParams?.ancestorId !== 'string'
  ) {
    return res.status(400).json({ error: 'query and ancestorId are required' })
  }

  try {
    const results = await search(searchParams)

    res.setHeader(
      'Cache-Control',
      'public, s-maxage=60, max-age=60, stale-while-revalidate=60'
    )
    res.status(200).json(results)
  } catch {
    res.setHeader('Retry-After', '60')
    res
      .status(503)
      .json({ error: 'Search is temporarily unavailable. Please try again.' })
  }
}
