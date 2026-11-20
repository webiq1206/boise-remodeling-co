import { toSentenceCase } from './shared/sentenceCase';
import { generateCityServiceTitle } from './lib/seo';
import { SERVICES, CITIES } from './shared/contentData';
for (const s of SERVICES) for (const c of CITIES.slice(0,8)) console.log(generateCityServiceTitle(s.name,c.name), ' => ', toSentenceCase(generateCityServiceTitle(s.name,c.name)));
