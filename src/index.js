import { promises as fs } from 'fs';
import path from 'path';
import axios from 'axios';
import url from 'url';
import cheerio from 'cheerio';

const normalizeName = (name) => {
  const st = new RegExp('[a-zA-Z0-9]');
  return name.split('').map((e) => (!st.test(e) ? '-' : e)).join('');
};

const getPage = (request) => axios.get(request)
  .then((response) => response.data)
  .catch((error) => {
    if (error.response) {
      console.log(`Error response ${error.response.status}`);
      throw error.response.status;
    }
    throw error;
  });

const writePage = (data, pathToFile) => fs.writeFile(pathToFile, data, 'utf-8')
  .then(console.log('Done!'));

// link = href, img = src, script = src

const tags = [
  {
    name: 'link',
    attribute: 'href',
  }, {
    name: 'img',
    attribute: 'src',
  },
];

const dataHandling = (data, directory) => {
  const $ = cheerio.load(data);
  const links = [];
  tags.forEach((tag) => {
    $(tag.name).attr(tag.attribute, (i, element) => {
      if (element.indexOf('http') !== 0) {
        links.push(element);
        const filepath = path.parse(element);
        const newBaseName = normalizeName(`${filepath.dir}/${filepath.name}`).slice(1);
        return `${directory}/${newBaseName}${filepath.ext}`;
      }
      return element;
    });
  });
  return { data: $.html(), links };
};

const pageloader = (address, directory) => getPage(address)
  .then((data) => {
    const page = url.parse(address);
    const baseName = normalizeName(`${page.host}${page.path}`);
    const pathToFile = path.resolve(directory, `${baseName}.html`);
    const newData = dataHandling(data, `${baseName}_files`); // _files
    return writePage(newData.data, pathToFile);
  });

export default pageloader;
