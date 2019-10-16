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
  /*
  test('hexlet.io download page', async () => {
    const testPage = 'ru-hexlet-io-courses.html';
    const address = '/ru.hexlet.io/courses';
    const data = await fs.readFile(path.join(pathToTest, testPage), 'utf-8');

    nock(host)
      .get(address)
      .reply(200, data);

    await pageloader(address, testFolderPath);

    const content = await fs.readFile(path.join(testFolderPath, testPage), 'utf-8');

    expect(content).toEqual(data);
  });

  test('page not found', async () => {
    const address = 'notfound';
    nock(host)
      .get(address)
      .reply(404);

    return pageloader(address, testFolderPath).catch((e) => expect(e).toBe(404));
  });
  */
  test('Template', async () => {
    // https://www.templatemo.com
    const address = '/chilling_cafe';
    const fileNameBefore = 'chilling-cafe-before.html';
    const fileNameAfter = 'testhost-com-chilling-cafe.html';
    const dataBefore = await fs.readFile(path.join(pathToTest, fileNameBefore), 'utf-8');
    const dataAfter = await fs.readFile(path.join(pathToTest, fileNameAfter), 'utf-8');

    nock(host)
      .get(address)
      .reply(200, dataBefore);

    await pageloader(`${host}${address}`, testFolderPath);

    const content = await fs.readFile(path.join(testFolderPath, fileNameAfter), 'utf-8');

    console.log(testFolderPath);

    expect(content).toEqual(dataAfter);
  });
});
