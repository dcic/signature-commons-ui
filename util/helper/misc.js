export function get_formated_query(terms) {
  if (Array.isArray(terms)) {
    if (terms.length === 0) {
      return ''
    }
    return `?q=${terms.join('%26')}`
  } else if (typeof terms === 'string') {
    return `?q=${terms}`
  } else {
    return `?q=${Object.keys(terms).join('%26')}`
  }
}


export function parse_entities(input) {
  return Set(input.toUpperCase().split(/[ \t\r\n;]+/).reduce(
      (lines, line) => {
        const parsed = /^(.+?)(,(.+))?$/.exec(line)
        if (parsed !== null) {
          return [...lines, parsed[1]]
        }
        return lines
      }, []
  ))
}

export function maybe_fix_obj(obj) {
  if (Array.isArray(obj)) {
    return obj.reduce((objs, v) => {
      if (v.id !== undefined) {
        objs[v.id] = v
      } else if (v.uuid !== undefined) {
        objs[v.uuid] = v
        objs[v.uuid].id = v.uuid
        delete objs[v.uuid].uuid
      }
      return objs
    }, {})
  }
  return Object.keys(obj).reduce((objs, k) => ({ ...objs, [k]: { ...obj[k], id: k } }), {})
}

export function build_where(queries) {
  const where = {}
  let andClauses = []
  let orClauses = []

  for (const q of queries) {
    if (q.indexOf(':') !== -1) {
      const [key, ...value] = q.split(':')
      if (key.startsWith('!') || key.startsWith('-')) {
        andClauses = [...andClauses, { ['meta.' + key.substring(1).trim()]: { nilike: '%' + value.join(':') + '%' } }]
      } else if (key.toLowerCase().startsWith('or ')) {
        orClauses = [...orClauses, { ['meta.' + key.substring(3).trim()]: { ilike: '%' + value.join(':') + '%' } }]
      } else if (key.startsWith('|')) {
        orClauses = [...orClauses, { ['meta.' + key.substring(1).trim()]: { ilike: '%' + value.join(':') + '%' } }]
      } else {
        andClauses = [...andClauses, { ['meta.' + key.trim()]: { ilike: '%' + value.join(':') + '%' } }]
      }
    } else {
      // full text query
      if (q.startsWith('!') || q.startsWith('-')) {
        // and not
        andClauses = [...andClauses, { meta: { fullTextSearch: { ne: q.substring(1).trim().split(' ') } } }]
      } else if (q.toLowerCase().startsWith('or ')) {
        orClauses = [...orClauses, { meta: { fullTextSearch: { eq: q.substring(3).trim().split(' ') } } }]
      } else if (q.startsWith('|')) {
        orClauses = [...orClauses, { meta: { fullTextSearch: { eq: q.substring(1).trim().split(' ') } } }]
      } else {
        // and
        andClauses = [...andClauses, { meta: { fullTextSearch: { eq: q.trim().split(' ') } } }]
      }
    }
  }
  if (orClauses.length > 0) {
    if (andClauses.length > 0) {
      orClauses = [...orClauses, { and: andClauses }]
    }
    where['or'] = orClauses
  } else {
    where['and'] = andClauses
  }

  return where
}

export const diffList = (prevList, currList) =>{
  if (prevList.length !== currList.length) return true
  const diff = prevList.filter(s=>currList.indexOf(s)===-1)
  if (diff.length>0) return true
  return false
}

// What it should do:
// 1. Modify where clause via searchbox
// 2. Add filter (parent and meta) (parents for now)
// 3. Add pages
export const URLFormatter = ({
  search,
  filters, // dictionary where the key is the field and the value is the filter values
  for_count,
  skip,
  limit,
}) => {
  if (filters!==undefined){
    return JSON.stringify({
      search,
      skip,
      limit,
      ...filters,
    })
  }else{
    return JSON.stringify({
      search,
      skip,
      limit
    })
  }
}

export const ReadURLParams = (params_str) => {
  const searchParams = new URLSearchParams(params_str);
  const params = JSON.parse(searchParams.get("q"))
  console.log(params)
  return {...params}
}