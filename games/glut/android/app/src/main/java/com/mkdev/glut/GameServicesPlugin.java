package com.mkdev.glut;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.games.GamesSignInClient;
import com.google.android.gms.games.LeaderboardsClient;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.PlayGamesSdk;

/**
 * Tablice wyników przez Google Play Games (v2). Część JS: `gameServices` w @funfactory/core.
 * Dopóki w res/values/strings.xml nie ma ID projektu gier z Play Console, wtyczka jest uśpiona
 * (zwraca „niezalogowany”), więc gra działa normalnie.
 */
@CapacitorPlugin(name = "GameServices")
public class GameServicesPlugin extends Plugin {
    private boolean ready = false;

    @Override
    public void load() {
        String appId = getContext().getString(R.string.game_services_project_id);
        if (appId != null && !appId.trim().isEmpty()) {
            PlayGamesSdk.initialize(getContext());
            ready = true;
        }
    }

    @PluginMethod
    public void signIn(PluginCall call) {
        if (!ready) {
            call.resolve(info(false, "", ""));
            return;
        }
        GamesSignInClient client = PlayGames.getGamesSignInClient(getActivity());
        client.isAuthenticated().addOnCompleteListener(task -> {
            boolean ok = task.isSuccessful() && task.getResult().isAuthenticated();
            if (ok) resolvePlayer(call);
            else client.signIn().addOnCompleteListener(t -> resolvePlayer(call));
        });
    }

    private void resolvePlayer(PluginCall call) {
        PlayGames.getPlayersClient(getActivity()).getCurrentPlayer().addOnCompleteListener(task -> {
            boolean ok = task.isSuccessful() && task.getResult() != null;
            call.resolve(info(ok, ok ? task.getResult().getPlayerId() : "", ok ? task.getResult().getDisplayName() : ""));
        });
    }

    private JSObject info(boolean authenticated, String playerId, String alias) {
        JSObject r = new JSObject();
        r.put("authenticated", authenticated);
        r.put("playerId", playerId);
        r.put("alias", alias);
        return r;
    }

    @PluginMethod
    public void submitScore(PluginCall call) {
        String id = call.getString("leaderboardId");
        Integer score = call.getInt("score");
        JSObject r = new JSObject();
        if (!ready || id == null || score == null) {
            r.put("submitted", false);
            call.resolve(r);
            return;
        }
        PlayGames.getLeaderboardsClient(getActivity()).submitScore(id, score);
        r.put("submitted", true);
        call.resolve(r);
    }

    @PluginMethod
    public void showLeaderboard(PluginCall call) {
        if (!ready) {
            call.reject("Play Games nie jest skonfigurowane");
            return;
        }
        LeaderboardsClient client = PlayGames.getLeaderboardsClient(getActivity());
        String id = call.getString("leaderboardId");
        (id != null ? client.getLeaderboardIntent(id) : client.getAllLeaderboardsIntent())
            .addOnSuccessListener(intent -> {
                getActivity().startActivityForResult(intent, 9004);
                call.resolve();
            })
            .addOnFailureListener(e -> call.reject(e.getMessage()));
    }
}
