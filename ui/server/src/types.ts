export interface IUser {
  id: number;
  user: string;
  readOnly: boolean;
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