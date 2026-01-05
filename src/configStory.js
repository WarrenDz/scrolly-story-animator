// Defines the story node representing the sidecar block
export const nodeConfig = {
    nodeSelector: '#n-HBRFEg',
};

function generateScriptConfig() {
  window.storyMapsEmbedConfig = {
      storyId: "7f3db979115448cba7bccbf744b43766",
      rootNode: ".storymaps-root",
  };
}

function createScriptedEmbed() {
  const script = document.createElement('script');
  script.id = 'embed-script';
  script.src = `https://storymaps.arcgis.com/embed/view`;
  document.body.appendChild(script);
}

generateScriptConfig();
createScriptedEmbed();