import { promises as fs } from 'fs';
import path from 'path';
import axios from 'axios';

const normalizeName = (name) => {
  const st = new RegExp('[a-zA-Z0-9]');
  const pageName = name.slice(name.indexOf('//') + 2);
  return `${pageName.split('').map((e) => (!st.test(e) ? '-' : e)).join('')}.html`;
};

const getPage = (pageAddress, outputDirectory) => {
  console.log('ready!'); // delete this!!!
  return axios.get(pageAddress)
    .then((response) => {
      const name = path.join(outputDirectory, normalizeName(pageAddress));
      return fs.writeFile(name, response.data, 'utf-8');
    })
    .catch((error) => {
      if (error.response) {
        console.log(`Error ${error.response.status}`);
      }
      console.log(error);
    });
};

export default getPage;
