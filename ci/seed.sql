-- Minimal rows required for a fresh CI database (the schema dump has no data).
-- New users register with groupId DEFAULT 0, whose FK requires group id 0 to exist.
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

INSERT INTO `group` (`id`, `name`) VALUES (0, 'default')
  ON DUPLICATE KEY UPDATE `name` = `name`;

INSERT INTO `version` (`v`) VALUES (0);

-- The client picks a recipe's fallback thumbnail from a category-id -> image map
-- (ids 1..34, see ui/client/src/util/categoryImageMap.ts). Start categories well
-- above that range so seeded categories always fall back to the generic noRecipe
-- image, keeping recipe thumbnails deterministic across environments.
ALTER TABLE `category` AUTO_INCREMENT = 1000;
