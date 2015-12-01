var App = Backbone.Router.extend({
  routes: {
    '': 'renderMenu',
    'commands': 'renderCommands',
  },
  renderMenu: function () {
    this.view = new MenuView;
  },
  renderCommands: function () {
    this.view = new CommandsView;
  },
});
var app = new App();
if (!Backbone.history.start())
  app.navigate('', {trigger: true, replace: true});

BaseView.prototype.initI18n.call(window);

!function () {
  function commandClick(e, model) {
    chrome.tabs.sendMessage(app.currentTab.id, {
      cmd: 'Command',
      data: model.get('name'),
    });
  }
  function scriptSymbol(data) {
    return data ? 'fa-check' : 'fa-times';
  }
  function scriptClick(e, model) {
    var data = !model.get('data');
    _.sendMessage({
      cmd: 'UpdateScriptInfo',
      data: {
        id: model.get('id'),
        enabled: data,
      },
    }).then(function () {
      model.set({data: data});
      _.options.get('autoReload') && _.mx.br.tabs.getCurrentTab().refresh();
    });
  }
  function init() {
    getPopup();
  }
  function clear() {
    commandsMenu.reset([]);
    scriptsMenu.reset([]);
    delayedClear = null;
  }
  function cancelClear() {
    delayedClear && clearTimeout(delayedClear);
  }
  function delayClear() {
    cancelClear();
    delayedClear = setTimeout(clear, 200);
  }
  var getPopup = _.debounce(function () {
    _.injectContent('setPopup()');
    delayClear();
  }, 100);
  var delayedClear;

  var commands = {
    GetPopup: getPopup,
    SetPopup: function (data, src) {
      cancelClear();
      commandsMenu.reset(data.menus.map(function (menu) {
        return new MenuItem({
          name: menu[0],
          symbol: 'fa-hand-o-right',
          onClick: commandClick,
        });
      }));
      _.sendMessage({
        cmd: 'GetMetas',
        data: data.ids,
      }).then(function (scripts) {
        scriptsMenu.reset(scripts.map(function (script) {
          return new MenuItem({
            id: script.id,
            name: script.custom.name || _.getLocaleString(script.meta, 'name'),
            data: !!script.enabled,
            symbol: scriptSymbol,
            title: true,
            onClick: scriptClick,
          });
        }));
      });
    },
  };
  _.sendMessage = _.getMessenger({});
  _.mx.rt.listen('Popup', function (req) {
    var func = commands[req.cmd];
    if (func) func(req.data, req.src);
  });

  init();
  _.mx.br.onBrowserEvent = function (data) {
    switch (data.type) {
    case 'TAB_SWITCH':
    case 'ON_NAVIGATE':
      init();
    }
  };
}();