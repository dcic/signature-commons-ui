import { Set } from 'immutable'
import { fetch_meta_post } from '../../util/fetch/meta'
import { maybe_fix_obj } from '../../util/maybe_fix_obj'

export async function resolve_entities(props) {
  let entities = Set([...props.entities])
  const entitiy_ids = {}

  const { duration, response: entity_meta_pre } = await fetch_meta_post({
    endpoint: '/entities/find',
    body: {
      filter: {
        where: {
          'meta.Name': {
            inq: entities.toArray(),
          },
        },
        fields: [
          'id',
          'meta.Name',
        ],
      },
    },
    signal: props.controller.signal,
  })
  const entity_meta = maybe_fix_obj(entity_meta_pre)

  for (const entity of Object.values(entity_meta)) {
    const matched_entities = entities.intersect(
        Set([entity.meta.Name])
    )

    if (matched_entities.count() > 0) {
      entities = entities.subtract(matched_entities)
      for (const matched_entity of matched_entities) {
        entitiy_ids[matched_entity] = entity
      }
      if (matched_entities.count() > 1) {
        console.warn(entity, 'matched', [...matched_entities])
      }
    }
  }

  return {
    matched: entitiy_ids,
    mismatched: entities,
    duration,
  }
}
