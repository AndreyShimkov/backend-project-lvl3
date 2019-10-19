import '@babel/polyfill';
import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import axios from 'axios';
import nock from 'nock';
import httpAdapter from 'axios/lib/adapters/http';
import pageloader from '../src';

const host = 'http://testhost.com';

axios.defaults.host = host;
axios.defaults.adapter = httpAdapter;

const tmpDirectory = os.tmpdir();
const pathToTest = '__tests__/__fixtures__/';

describe('page loader test', () => {
  let testFolderPath;

  beforeEach(async () => {
    testFolderPath = await fs.mkdtemp(path.join(tmpDirectory, 'test-'));
  });

  test('Template Site', async () => {
    const addresses = ['/chilling_cafe',
      '/chilling/fontawesome/css/all.min.css',
      '/chilling/css/tooplate-chilling-cafe.css',
      '/chilling/js/jquery',
      '/chilling/img/chilling-cafe-11.jpg',
      '/chilling/img/chilling-cafe-12.jpg',
      '/chilling/img/chilling-cafe-13.jpg',
    ];

    const filesTest = [
      'chilling-css-tooplate-chilling-cafe.css',
      'chilling-fontawesome-css-all-min.css',
      'chilling-img-chilling-cafe-11.jpg',
      'chilling-img-chilling-cafe-12.jpg',
      'chilling-img-chilling-cafe-13.jpg',
      'chilling-js-jquery',
    ];

    const promises = addresses.map((v, i) => {
      const fileName = path.join(pathToTest, v);
      const testFileData = i > 3 ? fs.readFile(fileName) : fs.readFile(fileName, 'utf-8');
      return testFileData;
    });

    const tests = await Promise.all(promises);

    addresses.forEach((address, i) => {
      const dataBefore = tests[i];
      nock(host)
        .get(address)
        .reply(200, dataBefore);
    });

    await pageloader(`${host}${addresses[0]}`, testFolderPath);

    const fileNameAfter = 'testhost-com-chilling-cafe.html';
    const directoryName = 'testhost-com-chilling-cafe_files';

    const testAfter = await fs.readFile(path.join(pathToTest, fileNameAfter), 'utf-8');
    const pageloaderData = await fs.readFile(path.join(testFolderPath, fileNameAfter), 'utf-8');
    const filelist = await fs.readdir(path.join(testFolderPath, directoryName));

    expect(pageloaderData).toEqual(testAfter);

    expect(filelist).toEqual(filesTest);
  });
});
