import dayjs from "dayjs";
import { Base64 } from 'js-base64';
import { set, get, del } from 'idb-keyval';
import axios from 'axios';
import { localStorageUserInfo, localStorageUserChecksum, localStorageRecipeChecksum, localStorageCommentChecksum, localStorageCategoryChecksum } from "./StorageKeys";
import { IShoppingState as IShoppingList } from "../components/ShoppingList";

const RECIPE_CACHE = 'recipes';
const CATEGORY_CACHE = 'categories';
const USER_CACHE = 'users';
const COMMENT_CACHE = 'DBchecksum';


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
  comments: [],
}
export interface ICategory {
  id: number;
  name: string;
}

export interface IComment {
  id: number;
  text: string;
  user: IUser;
  date: string;
  editedDate?: string;
}

export interface IApiComment {
  id: number;
  text: string;
  userId: number;
  recipeId: number;
  date: string;
  editedDate?: string;

}

export interface IRecipe {
  title: string;
  category: ICategory;
  ingredients: string[];
  description: string;
  image: string;
  date: string;
  id: number;
  user: IUser;
  comments: IComment[];
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

export interface IUser {
  id: number;
  user: string;
  readOnly: boolean;
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

function apiToRecipe(r: IApiRecipe, categories: ICategory[], users: IUser[], comments: IApiComment[]): IRecipe {
  const category = categories.find(c => c.id === r.categoryId);
  const user = users.find(u => u.id === r.userId);
  const recipeComments = comments.filter(c => c.recipeId === r.id).map(c => apiToComment(c, users));

  return {
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
    },
    comments: recipeComments
  };
}

function reloadComments(r: IRecipe, users: IUser[], comments: IApiComment[]): IRecipe {
  const recipeComments = comments.filter(c => c.recipeId === r.id).map(c => apiToComment(c, users));
  return {...r, comments: recipeComments};
}

function apiToCategories(categories: IApiCategory[]): ICategory[] {
  return categories.map((c) => {
    return { id: c.id, name: c.name }
  });
}

function apiToComment(comment: IApiComment, users: IUser[]): IComment {
  const user = users.find(u => u.id === comment.userId);
  return {
    text: comment.text,
    user: {
      id: user?.id || -1,
      readOnly: user?.readOnly || true,
      user: user?.user || ''
    },
    id: comment.id,
    date: comment.date,
    editedDate: comment.editedDate
  }
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
  categories: ICategory[],
  users: IUser[]
) => void
class Recipes {

  private recipeCache: IRecipe[] = [];
  private categoryCache: ICategory[] = [];
  private commentCache: IApiComment[] = [];
  private userCache: IUser[] = [];

  private callbacks: ICallBack[] = [];

  constructor() {
    get<IRecipe[]>(RECIPE_CACHE).then(async (result) => {
      if (!result) {
        return;
      }
      for (const recipe of result) {
        if (!recipe.comments) {
          recipe.comments = [];
        }
      }
      this.recipeCache = result || [];
      this.categoryCache = await get<ICategory[]>(CATEGORY_CACHE) || [];
      this.userCache = await get<IUser[]>(USER_CACHE) || [];
      this.notify();
    });
    this.fetchData();
  }

  public subscribe(callback: ICallBack) {
    this.callbacks.push(callback);
    callback(this.recipeCache, this.categoryCache, this.userCache);
    this.fetchData();
    return () => { recipesHandler.unsubscribe(callback); };
  }

  public unsubscribe(cb: ICallBack) {
    this.callbacks.splice(this.callbacks.findIndex(a => a === cb), 1);
  }

  public getRecipeOnce(id: number) {
    console.log(this.recipeCache.filter(r => r.ingredients.length === 0));
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

  public async deleteComment(comment: IComment): Promise<boolean> {
    const headers = getHeaders();
    headers.append('Content-Type', 'application/json');
    const result = await fetch(`/api/comments/${comment.id}`, {
      method: 'DELETE',
      headers
    });
    this.fetchData();
    return result.status === 204;
  }

  public async updateComment(comment: IComment): Promise<boolean> {
    const headers = getHeaders();
    headers.append('Content-Type', 'application/json');
    const body = { text: comment.text }
    const result = await fetch(`/api/comments/${comment.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body)
    });
    this.fetchData();
    return result.status === 200;
  }
  public async addComment(comment: string, recipeId: number): Promise<boolean> {
    const headers = getHeaders();
    headers.append('Content-Type', 'application/json');
    const body = { text: comment, recipeId: recipeId }
    const result = await fetch(`/api/comments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    this.fetchData();
    return result.status === 200;
  }

  public async deleteImage(image: string): Promise<boolean> {
    const headers = getHeaders();
    headers.append('Content-Type', 'application/json');
    const result = await fetch(`/api/images/${image}`, {
      method: 'DELETE',
      headers
    });
    return result.status === 204;
  }

  public async addCategory(name: string): Promise<ICategory | undefined> {
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
    this.fetchData();
    return { id: (await result.json()).id, name };
  }

  public async addRecipe(recipe: IRecipe): Promise<number | undefined> {
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
    this.fetchData();
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
    this.fetchData();
    return result.status === 200;
  }

  public async deleteRecipe(recipe: IRecipe): Promise<boolean> {
    const headers = getHeaders();
    headers.append('Content-Type', 'application/json');
    const result = await fetch(`/api/recipes/${recipe.id}`, {
      method: 'DELETE',
      headers
    })
    this.fetchData();
    return result.status === 204;
  }

  private notify() {
    // console.debug('notifying', this.callbacks);
    for (const callback of this.callbacks) {
      callback(this.recipeCache, this.categoryCache, this.userCache);
    }
  }

  async fetchData() {
    try {
      // fetch users, categories, comments and finally recipes
      let reloadCommentsAfterFetching = false;

      let url = '/api/users';
      let checksum = localStorage.getItem(localStorageUserChecksum);
      if (checksum) {
        url += `?checksum=${checksum}`;
      }
      let result = await fetch(url);
      if (result.status === 204) {
        if (this.userCache.length === 0) {
          this.userCache = await get<IUser[]>(USER_CACHE) || [];
        }
      } else if (result.status !== 200) {
        await fetchUserInfo();
        return;
      } else {
        reloadCommentsAfterFetching = true;
        const resultJson: {
          users: IUser[],
          checksum: number
        } = await result.json();
        this.userCache = resultJson.users;
        await set(USER_CACHE, this.userCache);
        localStorage.setItem(localStorageUserChecksum, JSON.stringify(resultJson.checksum));
      }


      url = '/api/categories';
      checksum = localStorage.getItem(localStorageCategoryChecksum);
      if (checksum) {
        url += `?checksum=${checksum}`;
      }
      result = await fetch(url);
      if (result.status === 204) {
        if (this.categoryCache.length === 0) {
          this.categoryCache = await get<ICategory[]>(CATEGORY_CACHE) || [];
        }
      } else if (result.status !== 200) {
        await fetchUserInfo();
        return;
      } else {
        reloadCommentsAfterFetching = true;
        const resultJson: {
          categories: IApiCategory[],
          checksum: number
        } = await result.json();
        this.categoryCache = apiToCategories(resultJson.categories);
        await set(CATEGORY_CACHE, this.categoryCache);
        localStorage.setItem(localStorageCategoryChecksum, JSON.stringify(resultJson.checksum));
      }

      url = '/api/comments';
      checksum = localStorage.getItem(localStorageCommentChecksum);
      if (checksum) {
        url += `?checksum=${checksum}`;
      }
      result = await fetch(url);
      if (result.status === 204) {
        if (this.commentCache.length === 0) {
          this.commentCache = await get<IApiComment[]>(COMMENT_CACHE) || [];
        }
      } else if (result.status !== 200) {
        await fetchUserInfo();
        return;
      } else {
        reloadCommentsAfterFetching = true;
        const resultJson: {
          comments: IApiComment[],
          checksum: number
        } = await result.json();
        this.commentCache = resultJson.comments;
        await set(COMMENT_CACHE, this.commentCache);
        localStorage.setItem(localStorageCommentChecksum, JSON.stringify(resultJson.checksum));
      }

      url = '/api/recipes';
      checksum = localStorage.getItem(localStorageRecipeChecksum);
      if (checksum) {
        url += `?checksum=${checksum}`;
      }
      result = await fetch(url);
      if (result.status === 204) {
        if (this.recipeCache.length === 0) {
          this.recipeCache = await get<IRecipe[]>(RECIPE_CACHE) || [];
        }
      } else if (result.status !== 200) {
        await fetchUserInfo();
        return;
      } else {
        reloadCommentsAfterFetching = false; // no need to reload comments because we do it here, anyways
        const resultJson: {
          recipes: IApiRecipe[],
          checksum: number
        } = await result.json();
        this.recipeCache = resultJson.recipes.map(r => apiToRecipe(r, this.categoryCache, this.userCache, this.commentCache));
        await set(RECIPE_CACHE, this.recipeCache);
        localStorage.setItem(localStorageRecipeChecksum, JSON.stringify(resultJson.checksum));
      }

      if (reloadCommentsAfterFetching) {
        this.recipeCache = this.recipeCache.map(r => reloadComments(r, this.userCache, this.commentCache));
        await set(RECIPE_CACHE, this.recipeCache);
      }
      this.notify();
    } catch (e) {
      console.error('failed to fetch, offline', e);
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
    recipesHandler.fetchData();
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
    body: JSON.stringify({ username: user, password }),
    headers,
  });
  console.log(await result.text());
  return result.status === 200;
}

export async function logout() {
  const result = await fetch(`/api/logout`);
  if (result.status === 200) {
    userInfo = undefined;
    localStorage.clear()
    await del(RECIPE_CACHE);
    await del(CATEGORY_CACHE);
  }
}

export async function uploadShoppingList(items: IShoppingList) {
  const headers = getHeaders();
  headers.append('Content-Type', 'application/json');
  const result = await fetch('/api/shoppingList', {
    method: 'POST',
    body: JSON.stringify(items),
    headers
  });
  return result.status === 200;
}