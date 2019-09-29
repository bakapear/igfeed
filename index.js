let Feed = require('./newfeed')
let got = require('got')
let fs = require('fs')

let cfg = config('config.json')

let feed = new Feed({ name: cfg.name })
console.log(`Tracking Instagram posts of ${cfg.name}...`)

feed.on('new', async items => {
  let res = body()
  items.forEach(item => {
    let data = {
      type: item.node.is_video ? 'video' : 'image',
      url: item.node.is_video ? item.node.video_url : item.node.display_url,
      link: 'https://instagram.com/p/' + item.node.shortcode,
      caption: item.node.edge_media_to_caption.edges[0] ? item.node.edge_media_to_caption.edges[0].node.text : '',
      timestamp: (new Date(item.node.taken_at_timestamp * 1000)).toISOString()
    }
    res.embeds.push(embed(data))
  })
  send(res)
  notify(res)
})

function send (data) {
  if (!cfg.hook) return
  try {
    got.post(cfg.hook, {
      body: data,
      json: true
    })
  } catch (e) { if (e) console.error(e) }
}

function body () {
  return {
    username: cfg.name || 'Instagram',
    avatar_url: feed.avatar || 'https://i.imgur.com/LZA6IN2.png',
    embeds: []
  }
}

function embed (item) {
  let res = {
    title: `${cfg.name} posted on Instagram!`,
    color: cfg.color || undefined,
    url: item.link,
    timestamp: item.timestamp,
    image: { url: item.url }
  }
  if (item.caption) res.title = item.caption
  return res
}

function notify (res) {
  if (!res || !res.embeds) return
  for (let i = 0; i < res.embeds.length; i++) {
    console.log(`[${res.embeds[i].timestamp}] - ${res.embeds[i].url}`)
  }
}

function config (file) {
  if (!fs.existsSync(file)) throw new Error(`${file} not present!`)
  let cfg = null
  try {
    cfg = JSON.parse(fs.readFileSync(file, { encoding: 'utf-8' }))
  } catch (e) { throw new Error(`Error parsing ${file}!`) }
  if (!cfg.name) throw new Error(`${file} is missing the "name" property!`)
  if (!cfg.hook) throw new Error(`${file} is missing the "hook" property!`)
  return cfg
}

// pear was here
