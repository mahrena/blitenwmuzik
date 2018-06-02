const Discord = require('discord.js');
const client = new Discord.Client();
const ytdl = require("ytdl-core");
const request = require("request");
const fs = require("fs");
const getYouTubeID = require("get-youtube-id");
const fetchVideoInfo = require("youtube-info");

var config = JSON.parse(fs.readFileSync('./settings.json', 'utf-8'));

const yt_api_key = config.yt_api_key;
const bot_controller = config.bot_controller;
const prefix = config.prefix;
const discord_token = config.discord_token;

var queue = [];
var isPlaying = false;
var dispatcher = null;
var voiceChannel = null;
var skipReq = 0;
var skippers = [];

client.login(discord_token);
client.on('message', function (message) {
    const member = message.member;
    const mess = message.content.toLowerCase();
    const arg = message.content.split(' ').slice(1).join(" ");

    if(mess.startsWith(prefix + "oynat")) {
        if (queue.length > 0 || isPlaying) {
          getID(arg, function (id) {
            add_to_queue(id);
            fetchVideoInfo(id, function (err, videoInfo) {
              if (err) throw new Error(err);
              message.reply( " Kuyruğa Eklendi: **" + videoInfo.title + "**");
            });
          })
        }else {
          isPlaying = true;
          getID(arg, function (id) {
            queue.push("placeholder");
            playMusic(id, message);
            fetchVideoInfo(id, function (err, videoInfo) {
              if (err) throw new Error(err);
              message.reply( " Şuan Oynatılıyor: **" + videoInfo.title + "**");
            });
          });
        }
    } else if (mess.startsWith(prefix + "atla")) {
      if (skippers.indexOf(message.author.id) === -1) {
        skippers.push(message.author.id);
        skipReq++;
        if (skipReq >= Math.ceil((voiceChannel.members.size - 1) / 2)) {
          skip_song(message);
          message.reply(" Atlanıyor!");
        } else {
          message.reply(" Skip noted. You need a total of " + Math.ceil((voiceChannel.members.size - 1) / 2) + " votes. \nYou currently have " + skipReq);
        }
      } else {
        message.reply(" zaten atlamak için oy verdiniz");
      }
    } if (mess.startsWith(prefix + "rastgele")) {
      message.reply(" You rolled a **" + Math.floor((Math.random() * 100) + 1) + "**");
    }  if (mess.startsWith(prefix + "komutlar")) {
    message.author.send("** şimdiki komutların listesi ** \n1. !rastgele \n2. !oynat (şarkı ismi) \n3 !atla \n4 !komutlar \n5. !fs");
  } if (mess.startsWith(prefix + "fs")) {
    if (member.roles.has('331301479316979722')){
      if (isPlaying) {
      skip_song(message);
      console.log(`Kullanıcı, ${member} şarkı atlattı`)
      message.reply("** Şarkıyı yönetici ayrıcalıklarıyla atlama!");
    } else {
      message.reply(" Şarkı çalmıyor!")
    }
  } else {
    message.reply("Eksik rol Yöneticisi");
  }
}
});

client.on('ready', function() {
  console.log("Bot artık hazır!");
});

function pluck(array) {
  return array.map(function(item) { return item["name"]; });
}

function hasRole(mem, role) {
  if(pluck(mem.roles).includes(role)){
    return true;
  } else {
    return false;
  }
}

function skip_song(message) {
  dispatcher.end();
  if (queue.length > 1) {
    playMusic(queue[0].  message);
  } else {
    skipReq = 0;
    skippers = [];
  }
}

function playMusic(id, message) {
  voiceChannel = message.member.voiceChannel;

  voiceChannel.join().then(function (connection) {
    stream = ytdl("https://www.youtube.com/watch?v=" + id, {
      filter: 'audioonly'
    });
    skipReq = 0;
    skippers = [];

    dispatcher = connection.playStream(stream);
    dispatcher.on('end', function() {
      skipReq = 0;
      skippers = [];
      queue.shift();
      if (queue.length === 0) {
          queue = [];
          isPlaying = false;
      } else {
        playMusic(queue[0], message);
      }
    });
  });
}

function getID(str, cb) {
  if (isYoutube(str)) {
    cb(getYouTubeID(str));
  } else {
    search_video(str, function (id) {
      cb(id);
    });
  }
}

function add_to_queue(strID) {
  if (isYoutube(strID)) {
    queue.push(getYouTubeID(strID));
  } else {
    queue.push(strID);
  }
}

function search_video(query, cb) {
    request("https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=" + encodeURIComponent(query) + "&key=" + yt_api_key, function(error, response, body) {
        var json = JSON.parse(body);
        cb(json.items[0].id.videoId);
    });
}

function isYoutube(str) {
  return str.toLowerCase().indexOf("youtube.com") > -1;
}
