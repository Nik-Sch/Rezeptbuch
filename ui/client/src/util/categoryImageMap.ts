import veg from '../static/default-images/noRecipeVeg.webp';
import main from '../static/default-images/noRecipeMain.webp';
import desert from '../static/default-images/noRecipeDesert.webp';
import cocktail from '../static/default-images/noRecipeCocktail.webp';
import cake from '../static/default-images/noRecipeCake.webp';
import salad from '../static/default-images/noRecipeSalad.webp';
import soup from '../static/default-images/noRecipeSoup.webp';
import dips from '../static/default-images/noRecipeDips.webp';
import starter from '../static/default-images/noRecipeStarter.webp';
import exp from '../static/default-images/noRecipeExp.webp';
import bread from '../static/default-images/noRecipeBread.webp';
import beilagen from '../static/default-images/noRecipeBeilagen.webp';
import vegPng from '../static/default-images/noRecipeVeg.png';
import mainPng from '../static/default-images/noRecipeMain.png';
import desertPng from '../static/default-images/noRecipeDesert.png';
import cocktailPng from '../static/default-images/noRecipeCocktail.png';
import cakePng from '../static/default-images/noRecipeCake.png';
import saladPng from '../static/default-images/noRecipeSalad.png';
import soupPng from '../static/default-images/noRecipeSoup.png';
import dipsPng from '../static/default-images/noRecipeDips.png';
import starterPng from '../static/default-images/noRecipeStarter.png';
import expPng from '../static/default-images/noRecipeExp.png';
import breadPng from '../static/default-images/noRecipeBread.png';
import beilagenPng from '../static/default-images/noRecipeBeilagen.png';

const map: { [i: number]: string } = {
  1: exp,
  2: cocktail,
  3: dips,
  4: main,
  5: cake,
  6: desert,
  7: salad,
  8: soup,
  9: starter,
  10: veg,
  17: bread,
  23: desert,
  24: bread,
  25: cocktail,
  26: main,
  27: cake,
  33: beilagen
}
export const mapPng: { [i: number]: string } = {
  1: expPng,
  2: cocktailPng,
  3: dipsPng,
  4: mainPng,
  5: cakePng,
  6: desertPng,
  7: saladPng,
  8: soupPng,
  9: starterPng,
  10: vegPng,
  17: breadPng,
  23: desertPng,
  24: breadPng,
  25: cocktailPng,
  26: mainPng,
  27: cakePng,
  33: beilagenPng
}

export default function categoryImageMap() {
  if (navigator.userAgent.toLowerCase().includes('safari')) {
    return mapPng;
  } else {
    return map;
  }
};