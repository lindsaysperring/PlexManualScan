const readline = require("readline");
const axios = require("axios");
const Fuse = require("fuse.js");
const fs = require("fs");
const { plexToken, plexURL } = require("./config");

const params = {
  "X-Plex-Token": plexToken,
};

let sections, selectedSection, sectionContents, selectedItem;

const TestConnection = () => {
  return axios.get(`${plexURL}`, { params });
};

const GetSections = () => {
  return axios.get(`${plexURL}/library/sections`, { params });
};

const GetSectionItems = (sectionID) => {
  return axios.get(`${plexURL}/library/sections/${sectionID}/all`, { params });
};

const GetItem = (key) => {
  return axios.get(`${plexURL}${key}`, { params });
};

const ScanPath = (path) => {
  return axios.get(
    `${plexURL}/library/sections/${sections[selectedSection].key}/refresh`,
    {
      params: { ...params, path: path },
    }
  );
};

const axiosErrors = (error) => {
  // Error 😨
  if (error.response) {
    /*
     * The request was made and the server responded with a
     * status code that falls out of the range of 2xx
     */
    console.log(error.response.data);
    console.log(error.response.status);
    console.log(error.response.headers);
  } else if (error.request) {
    /*
     * The request was made but no response was received, `error.request`
     * is an instance of XMLHttpRequest in the browser and an instance
     * of http.ClientRequest in Node.js
     */
    console.log(error.request);
  } else {
    // Something happened in setting up the request and triggered an Error
    console.log("Error", error.message);
  }
  console.log(error.config);
  return { error: true };
};

const selectSection = async () => {
  console.log("Plex Libraries:");

  sections.forEach((section, i) => {
    console.log(`[${i}]: ${section.title} [${section.type}]`);
  });
  return new Promise(async (resolve) => {
    while (!selectedSection) {
      var library = await getInput("Please select a library: ");
      if (library >= 0 && library < sections.length) {
        selectedSection = library;
      } else {
        console.log("Invalid library number");
      }
    }
    resolve(library);
  });
};

const searchLibrary = async () => {
  const options = {
    // Search in `author` and in `tags` array
    keys: ["title"],
    threshold: 0.4,
  };

  const fuse = new Fuse(sectionContents, options);
  let chosen = null;
  while (!chosen) {
    const searchTerm = await getInput(
      `${capitalizeFirstLetter(sections[selectedSection].type)} to search for: `
    );
    const result = fuse.search(searchTerm);
    console.log("Results: ");
    result.forEach((r, i) => {
      console.log(`[${i}]: ${r.item.title}`);
    });
    console.log(`[${result.length}]: Search again`);

    const selected = await getInput(
      `Select a ${sections[selectedSection].type}: `
    );
    if (selected >= 0 && selected < result.length) {
      chosen = result[selected].item;
    } else if (selected != result.length) {
      console.log("Invalid Input!");
    }
  }
  selectedItem = chosen;
};

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function getInput(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

const chosenItem = async () => {
  const yn = await getInput(`Scan for ${selectedItem.title}? (y/n): `);
  const yes = ["y", "Y", "yes", "Yes", "YES"];
  let path;
  if (yes.includes(yn)) {
    const item = await GetItem(selectedItem.key)
      .then((res) => res.data.MediaContainer.Metadata)
      .catch(axiosErrors);
    if (sections[selectedSection].type == "show") {
      const all = await GetItem(item[0].key)
        .then((res) => {
          return res.data.MediaContainer.Metadata;
        })
        .catch(axiosErrors);
      path = require("path").dirname(all[0].Media[0].Part[0].file).split("/");
      path.pop();
      path = path.join("/");
    } else {
      // console.log(item[0].Media[0].Part[0].fi)
      path = require("path").dirname(item[0].Media[0].Part[0].file);
    }
    console.log(path);
    if (!path) {
      console.log("Something went wrong");
      return;
    }
    const scanResult = await ScanPath(path).catch(axiosErrors);

    if (scanResult && scanResult.error) {
      console.log("Something went wrong");
      return;
    } else {
      console.log(`Plex is scanning: ${selectedItem.title}`);
    }
  } else {
    selectedSection = sectionContents = selectedItem = null;
    return main();
  }
};

async function main() {
  const initialize = await TestConnection()
    .then(GetSections)
    .then((res) => {
      sections = res.data.MediaContainer.Directory;
    })
    .catch(axiosErrors);

  if (initialize && initialize.error) return;

  await selectSection();

  sectionContents = await GetSectionItems(sections[selectedSection].key)
    .then((res) => res.data.MediaContainer.Metadata)
    .catch(axiosErrors);

  if (sectionContents && sectionContents.error) return;
  // console.log(sectionContents);
  await searchLibrary();

  await chosenItem();
}

main();
