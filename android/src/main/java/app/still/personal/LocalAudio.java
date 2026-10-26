package app.still.personal;

import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.SoundPool;
import android.os.SystemClock;
import android.os.Handler;
import android.os.Looper;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.function.Consumer;

/** Plays bundled files directly, without WebView media/network interception. UI-thread owned. */
final class LocalAudio {
    private final Context context;
    private final Consumer<String> error;
    private final SoundPool pool;
    private final Map<String,Integer> sounds = new HashMap<>();
    private final Set<Integer> ready = new HashSet<>();
    private final Set<Integer> streams = new LinkedHashSet<>();
    private final Map<String,Long> lastPlayed = new HashMap<>();
    private MediaPlayer music;
    private String track = "";
    private boolean prepared, foreground = true, active, effectsEnabled, musicEnabled;
    private float master = .7f, effects = 1f, background = .8f;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private int textureStream;
    private String textureName = "";
    private final Runnable textureStop = this::stopTexture;

    LocalAudio(Context context, Consumer<String> error) {
        this.context = context; this.error = error;
        AudioAttributes attributes = new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_GAME)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build();
        pool = new SoundPool.Builder().setMaxStreams(6).setAudioAttributes(attributes).build();
        pool.setOnLoadCompleteListener((soundPool,id,status) -> {
            if(status == 0) ready.add(id);
        });
        for(String name : new String[]{"water","water2","pop","pop2","slime","slime2","click","switch","toggle","metal","zipper","carve","sand","dial","chop","glass","clink","wrap","space"}) {
            try(AssetFileDescriptor file = context.getAssets().openFd("audio/" + name + ".wav")) {
                sounds.put(name,pool.load(file,1));
            } catch(Exception failure) { error.accept("Effect unavailable: " + name); }
        }
    }

    void configure(boolean active, boolean effectsEnabled, boolean musicEnabled,
                   double master, double effects, double background, String choice) {
        this.active=active; this.effectsEnabled=effectsEnabled; this.musicEnabled=musicEnabled;
        this.master=level(master); this.effects=level(effects); this.background=level(background);
        String filename = "carefree".equals(choice) ? "carefree.mp3"
            : "dream".equals(choice) ? "dream-culture.mp3" : "floating-cities.mp3";
        if(!filename.equals(track)) {
            releaseMusic(); track=filename;
            if(musicEnabled) prepareMusic();
        } else if(music == null && musicEnabled) prepareMusic();
        sync();
    }

    private static float level(double value) {
        return Double.isNaN(value) || Double.isInfinite(value) ? 0f : (float)Math.max(0,Math.min(1,value));
    }

    private void prepareMusic() {
        try(AssetFileDescriptor file=context.getAssets().openFd("audio/"+track)) {
            final MediaPlayer player=new MediaPlayer(); music=player; prepared=false;
            player.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_GAME)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build());
            player.setDataSource(file.getFileDescriptor(),file.getStartOffset(),file.getLength());
            player.setLooping(true);
            player.setOnPreparedListener(p -> { if(music == p) { prepared=true; sync(); } });
            player.setOnErrorListener((p,what,extra) -> {
                if(music == p) { releaseMusic(); error.accept("Music playback failed."); }
                return true;
            });
            player.prepareAsync();
        } catch(Exception failure) { releaseMusic(); error.accept("Music file unavailable."); }
    }

    void play(String name, double volume, double rate) {
        if(!foreground || !active || !effectsEnabled) return;
        Integer id=sounds.get(name); if(id == null || !ready.contains(id)) return;
        long now=SystemClock.elapsedRealtime(),last=lastPlayed.containsKey(name)?lastPlayed.get(name):0;
        if(now-last<30)return;lastPlayed.put(name,now);
        float gain=level(volume)*master*effects;
        float speed=Double.isNaN(rate)||Double.isInfinite(rate)?1f:(float)Math.max(.5,Math.min(2,rate));
        int stream=pool.play(id,gain,gain,1,0,speed);
        if(stream != 0){streams.add(stream);if(streams.size()>32)streams.remove(streams.iterator().next());}
    }

    void setForeground(boolean value) { foreground=value; sync(); }

    void texture(String name,double volume,double rate) {
        if(!foreground || !active || !effectsEnabled)return;
        if(!"carve".equals(name) && !"sand".equals(name) && !"zipper".equals(name))return;
        Integer id=sounds.get(name);if(id==null || !ready.contains(id))return;
        float gain=level(volume)*master*effects;
        float speed=Double.isNaN(rate)||Double.isInfinite(rate)?1f:(float)Math.max(.5,Math.min(2,rate));
        if(textureStream==0 || !textureName.equals(name)){
            stopTexture();textureName=name;textureStream=pool.play(id,gain,gain,2,-1,speed);
        } else {pool.setVolume(textureStream,gain,gain);pool.setRate(textureStream,speed);}
        handler.removeCallbacks(textureStop);handler.postDelayed(textureStop,160);
    }
    void stopTexture(){handler.removeCallbacks(textureStop);if(textureStream!=0)pool.stop(textureStream);textureStream=0;textureName="";}

    private void sync() {
        boolean audible=foreground && active;
        if(!audible || !effectsEnabled){stopTexture();for(int stream:streams)pool.stop(stream);streams.clear();}
        if(music != null && prepared) {
            music.setVolume(master*background,master*background);
            if(audible && musicEnabled){if(!music.isPlaying())music.start();}
            else if(music.isPlaying())music.pause();
        }
    }

    private void releaseMusic() {
        if(music != null){music.setOnPreparedListener(null);music.setOnErrorListener(null);music.release();}
        music=null;prepared=false;
    }
    void release(){setForeground(false);pool.release();releaseMusic();}
}
