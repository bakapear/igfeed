let fs = require('fs')
let Corrin = require('corrin')
let dp = require('despair')
let cfg = config('config.json')

let feed = new Corrin([async () => (await data(cfg.name)).items, x => x.node.id])
console.log(`Tracking Instagram posts of ${cfg.name}...`)

feed.on('new', async items => {
  let user = await data(cfg.name)
  let res = body(user)
  items['0'].forEach(item => {
    let data = {
      url: item.node.display_url,
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
    dp.post(cfg.hook, {
      data: data,
      type: 'json'
    })
  } catch (e) { console.error(e) }
}

function body (user) {
  return {
    username: user.name || 'Instagram',
    avatar_url: user.avatar || 'https://i.imgur.com/LZA6IN2.png',
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

async function data (name) {
  let body = await dp(`https://www.instagram.com/${name}`, { query: { __a: 1 } }).json().catch(e => {
    throw Error(`Could not find the user '${name}'`)
  })
  let user = body.graphql.user
  return {
    name: user.username,
    avatar: user.profile_pic_url,
    items: user.edge_owner_to_timeline_media.edges
  }
}

process.on('unhandledRejection', err => {
  console.log(err)
  console.error(`\x1b[31mError: ${err.message}\x1b[0m`)
  process.exit(1)
})
