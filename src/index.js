import { promises as fs } from 'fs';
import path from 'path';
import axios from 'axios';
// import cheerio from 'cheerio';

const normalizeName = (name) => {
  const st = new RegExp('[a-zA-Z0-9]');
  const pageName = name.slice(name.indexOf('//') + 2);
  return `${pageName.split('').map((e) => (!st.test(e) ? '-' : e)).join('')}.html`;
};
/*
const loadLocalFiles = (data) => {
  const $ = cheerio.load(data);
  $('img').attr('src');
  return $.html();
};
*/
const pageloader = (pageAddress, outputDirectory) => {
  console.log('Ready...'); // delete this!!!
  return axios.get(pageAddress)
    .then((response) => {
      const name = path.resolve(outputDirectory, normalizeName(pageAddress));
      return fs.writeFile(name, response.data, 'utf-8')
        .then(console.log('Done!'));
    })
    .catch((error) => {
      if (error.response) {
        console.log(`Error response ${error.response.status}`);
        throw error.response.status;
      }
      throw error;
    });
};

export default pageloader;
