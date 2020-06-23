import dayjs from "dayjs";
import { Base64 } from 'js-base64';
import { set, get, keys, del } from 'idb-keyval';
import axios from 'axios';
import { localStorageUserInfo } from "./StorageKeys";

const RECIPE_CACHE = 'recipes';
const CATEGORY_CACHE = 'categories';
const USER_CACHE = 'users';
const CHECKSUM_CACHE = 'DBchecksum';


export const emptyRecipe: IRecipe = {
  title: '',
  category: {
    name: '',
    id: -1
  },
  ingredients: [],
  description: '',
  date: '',
  id: -1,
  image: '',
  user: {
    id: -1,
    readOnly: true,
    user: ''
  },
}
export interface ICategory {
  id: number;
  name: string;
}

export interface IRecipe {
  title: string;
  category: ICategory;
  ingredients: string[];
  description: string;
  image: string;
  date: string;
  id: number;
  user: IApiUser;
}

interface IApiRecipe {
  title: string,
  categoryId: number,
  ingredients: string,
  description: string,
  image: string,
  date: string,
  id: number,
  userId: number
}

interface IApiCategory {
  id: number,
  name: string,
  userId: number
}

interface IApiUser {
  id: number,
  user: string,
  readOnly: boolean
}

interface IApiResult {
  recipes: IApiRecipe[],
  categories: IApiCategory[],
  users: IApiUser[],
  checksum: number
}



function mapRecipeToAPI(recipe: IRecipe): IApiRecipe {
  return {
    title: recipe.title,
    categoryId: recipe.category.id,
    ingredients: recipe.ingredients.reduce((previous, current, index) => {
      if (index === 0) {
        return current;
      }
      if (current.trim() === '') {
        return previous;
      }
      return `${previous}\n${current}`;
    }, ''),
    description: recipe.description,
    image: recipe.image,
    date: recipe.date,
    id: recipe.id,
    userId: recipe.user.id
  }
}

function apiToRecipe(r: IApiRecipe, categories: ICategory[], users: IApiUser[]): IRecipe {
  const category = categories.find(c => c.id === r.categoryId);
  const user = users.find(u => u.id === r.userId);

  const result: IRecipe = {
    title: r.title,
    category: {
      name: category?.name || '',
      id: category?.id || -1
    },
    ingredients: r.ingredients.replace(/^\s*-\s+/gm, '').replace(/\r/, '').split('\n').filter(v => v.trim().length > 0),
    description: r.description,
    image: r.image,
    date: dayjs(r.date).toString(),
    id: r.id,
    user: {
      id: user?.id || -1,
      readOnly: user?.readOnly || true,
      user: user?.user || ''
    }
  };
  return result;
}

function apiToCategories(x: IApiResult): ICategory[] {
  return x.categories.map((c) => {
    return { id: c.id, name: c.name }
  });
}

export function getHeaders(): Headers {
  let headers = new Headers();
  return headers;
}

export interface IUploadCallbacks {
  onUploadProgress?: ((event: any) => void);
  onSuccess?: ((event: any) => void);
  onFailure?: ((event: any) => void);
}


type ICallBack = (
  recipes: IRecipe[],
  categories: ICategory[]
) => void
class Recipes {

  private recipeCache: IRecipe[] = [];
  private categoryCache: ICategory[] = [];
  private userCache: IApiUser[] = [];

  private callbacks: ICallBack[] = [];

  constructor() {
    get<IRecipe[]>(RECIPE_CACHE).then(async (result) => {
      this.recipeCache = result || [];
      this.categoryCache = await get<ICategory[]>(CATEGORY_CACHE) || [];
      this.userCache = await get<IApiUser[]>(USER_CACHE) || [];
      this.notify();
    });
    this.fetch();
  }

  public subscribe(callback: ICallBack) {
    this.callbacks.push(callback);
    callback(this.recipeCache, this.categoryCache);
    this.fetch();
    return () => { recipesHandler.unsubscribe(callback); };
  }

  public unsubscribe(cb: ICallBack) {
    this.callbacks.splice(this.callbacks.findIndex(a => a === cb), 1);
  }

  public getRecipeOnce(id: number) {
    return this.recipeCache.find(r => r.id === id);
  }

  public uploadImage(image: File, callbacks?: IUploadCallbacks) {
    const form = new FormData();
    form.append('image', image);
    axios.post('/api/images', form, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: callbacks?.onUploadProgress
    }).then(callbacks?.onSuccess)
      .catch(callbacks?.onFailure);
  }

  public async deleteImage(image: string): Promise<boolean> {
    const headers = getHeaders();
    headers.append('Content-Type', 'application/json');
    const result = await fetch(`/api/images/${image}`, {
      method: 'DELETE',
      headers
    });
    this.fetch();
    return result.status === 204;
  }

  public async addCategory(name: string): Promise<ICategory|undefined> {
    const headers = getHeaders();
    headers.append('Content-Type', 'application/json');
    const body = { name };
    const result = await fetch(`/api/categories`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    if (result.status !== 200) {
      return undefined;
    }
    this.fetch();
    return { id: (await result.json()).id, name };
  }

  public async addRecipe(recipe: IRecipe): Promise<number|undefined> {
    const headers = getHeaders();
    headers.append('Content-Type', 'application/json');
    const body = mapRecipeToAPI(recipe);
    const result = await fetch(`/api/recipes`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    if (result.status !== 200) {
      return undefined;
    }
    this.fetch();
    return (await result.json()).id;
  }

  public async updateRecipe(recipe: IRecipe): Promise<boolean> {
    const headers = getHeaders();
    headers.append('Content-Type', 'application/json');
    const body = { ...mapRecipeToAPI(recipe), date: undefined, id: undefined }
    const result = await fetch(`/api/recipes/${recipe.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body)
    });
    this.fetch();
    return result.status === 200;
  }

  public async deleteRecipe(recipe: IRecipe): Promise<boolean> {
    const headers = getHeaders();
    headers.append('Content-Type', 'application/json');
    const result = await fetch(`/api/recipes/${recipe.id}`, {
      method: 'DELETE',
      headers
    })
    this.fetch();
    return result.status === 204;
  }

  private notify() {
    // console.debug('notifying', this.callbacks);
    for (const callback of this.callbacks) {
      callback(this.recipeCache, this.categoryCache);
    }
  }

  async fetch() {
    try {
      const url = (await keys()).includes(CHECKSUM_CACHE)
        ? `/api/recipesUpdate/${await get<number>(CHECKSUM_CACHE)}`
        : '/api/recipes';
      const result = await fetch(url);
      if (result.status === 200) {
        const resultJson: IApiResult = await result.json();
        this.categoryCache = apiToCategories(resultJson);
        this.userCache = resultJson.users;
        this.recipeCache = resultJson.recipes.map(r => apiToRecipe(r, this.categoryCache, this.userCache));
        this.notify();
        await set(RECIPE_CACHE, this.recipeCache)//.catch(err => console.log(err));
        await set(CATEGORY_CACHE, this.categoryCache)//.catch(err => console.log(err));
        await set(USER_CACHE, this.userCache)//.catch(err => console.log(err));
        await set(CHECKSUM_CACHE, resultJson.checksum)//.catch(err => console.log(err));
      } else if (result.status === 204) {
        if (this.recipeCache.length === 0) {
          this.recipeCache = await get<IRecipe[]>(RECIPE_CACHE) || [];
          this.userCache = await get<IApiUser[]>(USER_CACHE) || [];
          this.categoryCache = await get<ICategory[]>(CATEGORY_CACHE) || [];
          this.notify();
        }
      } else {
        await fetchUserInfo();
        // console.error('fetching result status: ', result.status);
      }
    } catch {
      console.error('failed to fetch, offline');
    }
  }
}

const recipesHandler = new Recipes();
export default recipesHandler;

export async function fetchUniqueRecipe(uuid: string): Promise<IRecipe | undefined> {
  const result = await fetch(`/api/uniqueRecipes/${uuid}`);
  if (result.status === 200) {
    return await result.json();
  } else {
    return undefined;
  }
}

export async function getUniqueRecipeLink(recipe: IRecipe): Promise<string | undefined> {
  const headers = getHeaders();
  headers.append('Content-Type', 'application/json');
  const result = await fetch(`/api/uniqueRecipes`, {
    method: 'POST',
    headers,
    body: JSON.stringify(recipe)
  });
  if (result.status === 200) {
    const response = await result.json();
    return `${document.location.origin}/uniqueRecipes/${response.createdId}`;
  } else {
    return undefined;
  }
}

export interface IStatus {
  username: string;
  write: boolean;
}

let userInfo: IStatus | undefined = undefined;

export function getUserInfo(): IStatus | undefined {
  if (typeof userInfo === 'undefined') {
    const item = localStorage.getItem(localStorageUserInfo);
    if (typeof item === 'string') {
      userInfo = JSON.parse(item);
    }
  }
  return userInfo;
}

export async function fetchUserInfo(): Promise<IStatus | undefined> {
  const result = await fetch('/api/status');
  if (result.status === 200) {
    userInfo = await result.json();
    localStorage.setItem(localStorageUserInfo, JSON.stringify(userInfo));
  } else {
    localStorage.removeItem(localStorageUserInfo);
    return undefined;
  }
}

export async function loginToRecipes(user: string, password: string) {
  const headers = getHeaders();
  headers.append('Authorization', 'Basic ' + Base64.encode(`${user}:${password}`));
  const result = await fetch(`/api/login`, { headers });
  if (result.status === 200) {
    recipesHandler.fetch();
    await fetchUserInfo();
    return true;
  } else {
    return false;
  }
}

export async function createAccount(user: string, password: string) {
  const headers = getHeaders();
  headers.append('Content-Type', 'application/json');
  const result = await fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify({username: user, password}),
    headers,
  });
  console.log(await result.text());
  return result.status === 200;
}

export async function logout() {
  const result = await fetch(`/api/logout`);
  if (result.status === 200) {
    userInfo = undefined;
    localStorage.removeItem(localStorageUserInfo);
    await del(CHECKSUM_CACHE);
    await del(RECIPE_CACHE);
    await del(CATEGORY_CACHE);
  }
}