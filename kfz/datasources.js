import { Settings, I18N, sanitizeHTML, FoundItems, Datasource, generateAddToTable, translatePage } from "./common.js";
await Settings.init();
await I18N.init();
translatePage();
function getFragment(datasource) {
    const template = document.getElementById('datasource-detail');
    const fragment = template.content.cloneNode(true);
    fragment.querySelector('h2').textContent = datasource.name;
    fragment.querySelector('.description').innerHTML = sanitizeHTML(datasource.description, [
        'b', 'i', 'em', 'br', 'p', 'ul', 'ol', 'li'
    ]);
    const table = fragment.querySelector('table');
    const addToTable = generateAddToTable(table);
    addToTable("ID", datasource.id);
    const a = document.createElement('a');
    a.href = datasource.url.href;
    a.textContent = datasource.url.href;
    addToTable('URL', a.outerHTML, true);
    const totalItems = datasource.items.size;
    let seenItems = 0;
    datasource.items.forEach(e => seenItems += FoundItems.has(e.id) ? 1 : 0);
    addToTable('Seen', `${seenItems} / ${totalItems}`);
    return fragment;
}
await Datasource.loadAll();
const datasourceList = document.querySelector('#datasources > ul');
Datasource.list.forEach(datasource => {
    datasourceList.append(getFragment(datasource));
});
