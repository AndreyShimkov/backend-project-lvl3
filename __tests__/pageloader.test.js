import '@babel/polyfill';
// import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import axios from 'axios';
import nock from 'nock';
import httpAdapter from 'axios/lib/adapters/http';
import pageloader from '../src';

const host = 'http://localhost';

axios.defaults.host = host;
axios.defaults.adapter = httpAdapter;

// const tmpDirectory = os.tmpdir();
const pathToTest = '__tests__/__fixtures__/';

const tests = [
  ['hexlet', '/ru.hexlet.io/courses', 'ru-hexlet-io-courses.html'],
  ['yandex', '/yandex.ru', 'yandex-ru.html'],
];

describe.each(tests)('page loader test', (name, address, testPage) => {
  beforeEach(async () => {
    // const folderPath = await fs.mkdtemp(tmpDirectory, 'test_');
    const data = await fs.readFile(path.join(pathToTest, testPage), 'utf-8');

    nock(host)
      .get(address)
      .reply(200, data);
  });

  it(name, async () => {
    const data = await fs.readFile(path.join(pathToTest, testPage), 'utf-8');

    await pageloader(`http://localhost${address}`, 'F:/Hexlet');

    const content = await fs.readFile(`F:/Hexlet/localhost-${testPage}`, 'utf-8');

    expect(content).toEqual(data);
  });
});
