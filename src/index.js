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

const dataHandling = (data, page, directory) => {
  const $ = cheerio.load(data);
  $('link').attr('href', (i, v) => {
    const link = url.parse(v);
    if (page.host === link.host || link.host === null) {
      const localData = getPage(`${page.protocol}//${page.host}${link.path}`);
      const pathToFile = path.resolve(directory, `${normalizeName(link.path)}`);
      console.log(pathToFile);
      fs.writeFile(localData, pathToFile, 'utf-8');
      return pathToFile;
    }
    return v;
  });
  return $.html();
};

const pageloader = (address, directory) => getPage(address)
  .then((data) => {
    const page = url.parse(address);
    const pathToFile = path.resolve(directory, `${normalizeName(`${page.host}${page.path}`)}.html`);
    const newData = dataHandling(data, page, directory);
    return writePage(newData, pathToFile);
  });

export default pageloader;
