/** Reviewed against City of Boise and City of Nampa permit guidance, 2026-09-26.
 * A mailing city or county name does not establish the permitting jurisdiction.
 */
export function permitGuidance(city:string):string {
  return `For a project in ${city}, confirm the property jurisdiction before applying. The city building department is the starting point for property within city limits; unincorporated property follows the county process. Required building and trade permits depend on the work. Confirm fees, inspections and current review times with the authority for the actual address.`;
}
export function permitSource(city:string):string|null {
  if(city.toLowerCase()==='boise')return 'https://www.cityofboise.org/departments/planning-and-development-services/building/building-permits/';
  if(city.toLowerCase()==='nampa')return 'https://www.cityofnampa.us/428/Residential-Permit-Applications';
  return null;
}
export function permitGuidanceHtml(city:string):string {
  const url=permitSource(city);
  return permitGuidance(city)+(url?` <a href="${url}">Check the official ${city} permit guidance</a>.`:'');
}
