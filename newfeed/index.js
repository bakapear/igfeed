let got = require('got')
let Events = require('events')

class Feed extends Events {
  constructor (obj) {
    super()
    getInstaUser(obj.name).then(user => {
      this.avatar = user.profile_pic_url
      let interval = obj.interval || 60000
      let last = []
      let timer = setInterval(async () => {
        let items = await getInstaMedia(user.id)
        if (items.length) {
          let unique = getUniques(last, items)
          if (last.length && unique.length) {
            this.emit('new', unique)
          }
        }
        last = items.slice(0)
      }, interval)
      this.close = () => clearInterval(timer)
    })
    function getUniques (a, b) {
      let c = a.map(x => x.node.id)
      let d = b.map(x => x.node.id)
      for (let i = d.length - 1; i >= 0; i--) {
        if (c.includes(d[i])) d.splice(i, 1)
      }
      return d.map(x => b.find(y => y.node.id === x))
    }
  }
}

async function getInstaMedia (id) {
  try {
    let url = 'https://www.instagram.com/graphql/query/'
    let { body } = await got(url, {
      query: {
        query_hash: '58b6785bea111c67129decbe6a448951',
        variables: JSON.stringify({
          id: id,
          first: 10
        })
      },
      json: true
    })
    return body.data.user.edge_owner_to_timeline_media.edges
  } catch (e) { return [] }
}

async function getInstaUser (name) {
  try {
    let url = `https://www.instagram.com/${name}/?__a=1`
    let { body } = await got(url, { json: true })
    return body.graphql.user
  } catch (e) { throw new Error('Instagram user not found!') }
}

module.exports = Feed
