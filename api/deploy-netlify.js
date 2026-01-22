import crypto from 'crypto'

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
    }

    const { repoFullName, htmlPath = 'index.html' } = req.body || {}

    if (!repoFullName) {
      return res.status(400).json({
        error: 'REPO_REQUIRED',
        example: { repoFullName: 'username/repo' }
      })
    }

    /* =============================
       1. Ambil HTML dari GitHub RAW
    ============================== */
    const rawUrl = `https://raw.githubusercontent.com/${repoFullName}/main/${htmlPath}`
    const htmlRes = await fetch(rawUrl)

    if (!htmlRes.ok) {
      return res.status(400).json({
        error: 'HTML_NOT_FOUND',
        rawUrl
      })
    }

    const html = await htmlRes.text()

    /* =============================
       2. Buat site Netlify
    ============================== */
    const siteRes = await fetch('https://api.netlify.com/api/v1/sites', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NETLIFY_TOKEN}`
      }
    })

    const site = await siteRes.json()
    if (!site.id) return res.status(500).json(site)

    /* =============================
       3. Create deploy
    ============================== */
    const hash = crypto.createHash('sha1').update(html).digest('hex')

    const deployRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${site.id}/deploys`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.NETLIFY_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: {
            'index.html': hash
          }
        })
      }
    )

    const deploy = await deployRes.json()
    if (!deploy.id) return res.status(500).json(deploy)

    /* =============================
       4. Upload file
    ============================== */
    await fetch(
      `https://api.netlify.com/api/v1/deploys/${deploy.id}/files/index.html`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${process.env.NETLIFY_TOKEN}`,
          'Content-Type': 'text/html'
        },
        body: html
      }
    )

    return res.json({
      url: site.ssl_url || site.url,
      state: 'ready'
    })

  } catch (e) {
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: e.message
    })
  }
}
