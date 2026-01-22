export default async function handler(req, res) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'GITHUB_TOKEN_MISSING' });
  }

  const r = await fetch('https://api.github.com/user/repos?per_page=100', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json'
    }
  });

  const data = await r.json();
  res.json(
    data.map(repo => ({
      full_name: repo.full_name
    }))
  );
}
