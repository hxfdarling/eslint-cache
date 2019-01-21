# eslint-cache

support eslint cache, because eslint cli not support relative path cache

## useage

install `eslint-cache`

```shell
npm i -D eslint-cache
```

run `eslint-cache` to check `.js,.jsx` files

```json
npx eslint-cache src lib --ext .js,.jsx
```

## support options

`--ext`
which file extensions need lint

`--cache-location`
set cache file path

`--id`
auto clean cache by change id

## help

```shell
eslint-cache -h
```
