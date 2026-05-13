import decorateInfoCard from '../../components/info-card.js';

/** DevDocs block name wrapper — shares logic with `info-card`. */
export default async function decorate(block) {
  return decorateInfoCard(block, { daaLh: 'infocard' });
}
