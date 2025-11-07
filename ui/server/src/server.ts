import express, { Request, Response } from 'express';
import fetch from 'node-fetch';
import { resolve } from 'path';
import { readFile } from 'fs';
import util from 'util';
import { IApiRecipe } from './types';
import morgan from 'morgan';

const readFileAsync = util.promisify(readFile);

const app = express();
const port = process.env.PORT ?? 3000;
const apiUri = process.env.API_URI ?? 'http://localhost:3040/api/';
const staticDir = process.env.STATIC_DIR ?? '../client/dist';
const expressSecret = process.env.EXPRESS_SECRET ?? 'Apple';

app.use(morgan('short'));

app.use(express.static(resolve(staticDir)));

app.all('/api/*slug', (req: Request, res: Response) => {
  const url = `${apiUri}/${req.url.replace('api/', '')}`;
  res.redirect(url);
});

app.get('/shoppingLists/*slug', async (req, res) => {
  console.log(`${req.url}`);
  const name = req.url.split('/').at(-1);
  if (name) {
    const index = (await readFileAsync(resolve(staticDir, 'index.html'), 'utf-8')).replaceAll(
      /(<meta\s+(?:property|name)="[^"]*description"\s+content=")[^"]*(">)/g,
      (_, p1, p2) => `${p1}Einkaufsliste ${decodeURI(name)}${p2}`,
    );
    res.send(index);
  } else {
    res.sendFile(resolve(staticDir, 'index.html'));
  }
});

app.get(['/uniqueRecipes/*slug', '/recipes/*slug'], async (req, res) => {
  const url = `${apiUri}${req.url}`;
  const result = await fetch(url, {
    headers: { 'Express-Secret': expressSecret },
  });
  if (result.ok) {
    const recipe = (await result.json()) as IApiRecipe;
    let index = await readFileAsync(resolve(staticDir, 'index.html'), 'utf-8');

    // replace title
    index = index
      .replaceAll(
        /(<meta\s+(?:property|name)="[^"]*title"\s+content=")[^"]*(">)/g,
        (_, p1, p2) => `${p1}${recipe.title}${p2}`,
      )
      .replace(/(<title>)[^>]*<\/title>/, `<title>${recipe.title}</title>`);

    // replace description
    index = index
      .replaceAll(
        /(<meta\s+(?:property|name)="[^"]*description"\s+content=")[^"]*(">)/g,
        (_, p1, p2) => `${p1}${recipe.description.split('\n')[0]} ...${p2}`,
      )
      .replace(
        /(<description>)[^>]*<\/description>/,
        `<description>${recipe.description.split('\n')[0]} ...</description>`,
      );

    // replace url
    const uniqueUrl = `https://${req.headers.host}${req.url}`;
    index = index.replaceAll(
      /(<meta\s+(?:property|name)="[^"]*url"\s+content=")[^"]*(">)/g,
      (_, p1, p2) => `${p1}${uniqueUrl}${p2}`,
    );

    // replace image
    if (recipe.image.length > 0) {
      index = index.replaceAll(
        /(<meta\s+(?:property|name)="[^"]*image"\s+content=")[^"]*(">)/g,
        (_, p1, p2) =>
          `${p1}https://${req.headers.host}/api/images/${recipe.image}?w=1500&h=1500${p2}`,
      );
    }
    res.send(index);
  } else {
    console.error(await result.text());
    res.sendStatus(404);
  }
});

app.get('/{*slug}', (req, res) => {
  res.sendFile(resolve(staticDir, 'index.html'));
});

app.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}`);
});
