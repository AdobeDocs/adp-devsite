/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/*
 * Local, milo-compatible placeholder helpers used by the marketo block.
 * Reads the adp-devsite placeholders.json using the site's existing loader.
 */
import { fetchPlaceholders as fetchSitePlaceholders, toCamelCase } from '../scripts/lib-helix.js';

const fetchedPlaceholders = {};

export const fetchPlaceholders = async (sheet = 'default') => {
  if (!fetchedPlaceholders[sheet]) {
    fetchedPlaceholders[sheet] = fetchSitePlaceholders(sheet).catch(() => ({}));
  }
  return fetchedPlaceholders[sheet];
};

const keyToStr = (key) => key.replaceAll('-', ' ');

async function getPlaceholder(key, config, sheet) {
  if (config?.placeholders?.[key]) return config.placeholders[key];

  const placeholders = await fetchPlaceholders(sheet);
  if (typeof placeholders?.[key] === 'string') return placeholders[key];

  const camelKey = toCamelCase(key);
  if (typeof placeholders?.[camelKey] === 'string') return placeholders[camelKey];

  return keyToStr(key);
}

export async function replaceKey(key, config, sheet = 'default') {
  if (typeof key !== 'string' || !key.length) return '';

  return getPlaceholder(key, config, sheet);
}

export async function replaceKeyArray(keys, config, sheet = 'default') {
  if (!Array.isArray(keys) || !keys.length) return [];

  const promiseArr = [];
  keys.forEach((key) => {
    promiseArr.push(getPlaceholder(key, config, sheet));
  });

  return Promise.all(promiseArr);
}
