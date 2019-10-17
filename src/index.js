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
  }, {
    name: 'script',
    attribute: 'src',
  },
];

const dataHandling = (data, directory) => {
  const $ = cheerio.load(data);
  const links = [];
  tags.forEach((tag) => {
    $(tag.name).each((i, element) => {
      const att = $(element).attr(tag.attribute);
      if (att && url.parse(att).protocol === null) {
        links.push(att);
        const filepath = path.parse(att);
        const newBaseName = normalizeName(`${filepath.dir}/${filepath.name}`).slice(1);
        $(element).attr(tag.attribute, `${directory}/${newBaseName}${filepath.ext}`);
      }
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
    return writePage(newData.data, pathToFile)
      .then(fs.mkdir(path.resolve(directory, `${baseName}_files`)));
  });

export default pageloader;
