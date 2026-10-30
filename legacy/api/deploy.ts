// TODO : Add the server side deployment here
// NOTE : This might need to be moved to a seperate repo since it will deploy this repo 🤷‍♂️
import { NextApiRequest, NextApiResponse } from 'next'

/**
 * A handler for the API /api/deploy
 * @param {NextApiRequest} req - the request object
 * @param {NextApiResponse} res - the response object
 * @returns None
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(500).json({
    reason: 'Not Yet Implemented'
  })
}
