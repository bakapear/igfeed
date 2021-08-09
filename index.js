let fs = require('fs')
let dp = require('despair')
let Corrin = require('corrin')
let cfg = config('config.json')

let IG = {
  /*
  getUser: async name => {
    let body = await dp('https://www.instagram.com/web/search/topsearch', {
      query: { query: name }
    }).json()
    if (!body.users.length) die(`Could not find any profiles matching '${name}'`)
    let user = body.users[0].user
    return {
      id: user.pk,
      name: user.full_name || user.username,
      avatar: user.profile_pic_url
    }
  },
  */
  getMedia: async (id, num) => {
    console.log('getMedia', id)
    try {
      let body = await dp('https://www.instagram.com/graphql/query/', {
        query: {
          query_hash: '58b6785bea111c67129decbe6a448951',
          variables: JSON.stringify({ id: id, first: num })
        }
      }).text()
      console.log(body)
    } catch (e) {
      console.log('ERROR', e)
    }
    return body.data.user.edge_owner_to_timeline_media.edges.map(node => {
      let item = node.node
      return {
        id: item.id,
        video: item.is_video ? item.video_url : null,
        url: item.display_url,
        link: 'https://instagram.com/p/' + item.shortcode,
        caption: item.edge_media_to_caption.edges[0] ? item.edge_media_to_caption.edges[0].node.text : '',
        timestamp: new Date(item.taken_at_timestamp * 1000)
      }
    })
  }
}

function config (file) {
  if (!fs.existsSync(file)) die(`${file} not present!`)
  let cfg = null
  try {
    cfg = JSON.parse(fs.readFileSync(file, { encoding: 'utf-8' }))
  } catch (e) { die(`Could not parse ${file}!`) }
  if (!cfg.legacyMode) cfg.legacyMode = {}
  if (!cfg.overrides) cfg.overrides = {}

  if (process.env.ID) cfg.id = process.env.ID
  if (process.env.HOOK) cfg.hook = process.env.HOOK
  if (process.env.INTERVAL) cfg.interval = process.env.INTERVAL
  if (process.env.LEGACY) cfg.legacyMode.enabled = true
  if (process.env.COLOR) cfg.legacyMode.color = process.env.COLOR
  if (process.env.NAME) cfg.overrides.name = process.env.NAME
  if (process.env.AVATAR) cfg.overrides.avatar = process.env.AVATAR

  if (!cfg.id) die(`${file} is missing the "id" property!`)
  if (!cfg.hook) die(`${file} is missing the "hook" property!`)

  return cfg
}

function body (user) {
  let res = { embeds: [] }
  if (cfg.overrides.enabled) {
    res.username = cfg.overrides.name
    res.avatar_url = cfg.overrides.avatar
  }
  return res
}

function embed (item) {
  let res = {
    title: `${cfg.name} posted on Instagram!`,
    color: cfg.legacyMode.color || undefined,
    url: item.link,
    timestamp: item.timestamp,
    image: { url: item.url }
  }
  if (item.caption) res.title = item.caption
  return res
}

function send (data) {
  if (!cfg.hook) return
  try {
    dp.post(cfg.hook, {
      data: data,
      type: 'json'
    }).catch(e => die(e.message))
  } catch (e) { die(e.message) }
}

function notify (res) {
  if (!res || !res.embeds) return
  for (let i = 0; i < res.embeds.length; i++) {
    console.log(`[${res.embeds[i].timestamp.toISOString()}] - ${res.embeds[i].url}`)
  }
}

function die (err) {
  console.error(`\x1b[31mError: ${err}\x1b[0m`)
  process.exit(1)
}

async function main () {
  let user = { id: cfg.id } // await IG.getUser(cfg.name)

  let feed = new Corrin([() => IG.getMedia(user.id, 10), x => x.id], cfg.interval)
  console.log(`Tracking Instagram posts of ${cfg.id}...`)

  feed.on('new', async items => {
    let res = body(user)
    items['0'].forEach(item => res.embeds.push(embed(item)))
    if (cfg.logging) notify(res)
    if (!cfg.legacyMode.enabled) {
      res.content = res.embeds.map(x => x.url).join('\n')
      delete res.embeds
    }
    send(res)
  })
}

// main()

dp('https://www.instagram.com/graphql/query', {
  query: {
    query_hash: '472f257a40c653c64c666ce877d59d2b',
    variables: JSON.stringify({ id: 45165826236, first: 10 })
  }
}).json().then(res => {
  console.log(res)
})
