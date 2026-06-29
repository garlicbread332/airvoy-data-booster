package PACKAGE_NAME

import android.app.*
import android.content.Context
import android.content.Intent
import android.graphics.*
import android.graphics.drawable.GradientDrawable
import android.os.*
import android.view.*
import android.widget.*
import androidx.core.app.NotificationCompat

class FloatingOverlayService : Service() {

    companion object {
        var instance: FloatingOverlayService? = null
        const val CHANNEL_ID = "airvoy_overlay"
        const val NOTIF_ID = 1001

        fun start(ctx: Context) {
            val i = Intent(ctx, FloatingOverlayService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ctx.startForegroundService(i)
            } else {
                ctx.startService(i)
            }
        }

        fun stop(ctx: Context) {
            ctx.stopService(Intent(ctx, FloatingOverlayService::class.java))
        }
    }

    private var windowManager: WindowManager? = null
    private var rootView: View? = null
    private var dataTextView: TextView? = null
    private var adsTextView: TextView? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        instance = this
        createNotificationChannel()
        startForeground(NOTIF_ID, buildNotification())
        mainHandler.post { setupFloatingWindow() }
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
        rootView?.let { windowManager?.removeView(it) }
        rootView = null
    }

    fun updateStats(ads: Int, data: Int) {
        mainHandler.post {
            dataTextView?.text = "+${data}MB"
            adsTextView?.text = "${ads} ads"
        }
    }

    private fun dp(v: Float): Int = (v * resources.displayMetrics.density).toInt()

    private fun setupFloatingWindow() {
        val wm = getSystemService(WINDOW_SERVICE) as WindowManager
        windowManager = wm

        val outer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(dp(10f), dp(8f), dp(10f), dp(8f))
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(14f).toFloat()
                colors = intArrayOf(Color.parseColor("#0F1A40"), Color.parseColor("#050C20"))
                gradientType = GradientDrawable.LINEAR_GRADIENT
                orientation = GradientDrawable.Orientation.TOP_BOTTOM
            }
        }

        val boltLabel = TextView(this).apply {
            text = "⚡ BOOSTER"
            textSize = 9f
            setTextColor(Color.parseColor("#00C6FF"))
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            letterSpacing = 0.1f
        }

        val dataText = TextView(this).apply {
            text = "+0MB"
            textSize = 16f
            setTextColor(Color.WHITE)
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
        }
        dataTextView = dataText

        val adsText = TextView(this).apply {
            text = "0 ads"
            textSize = 10f
            setTextColor(Color.parseColor("#6B7FA3"))
            gravity = Gravity.CENTER
        }
        adsTextView = adsText

        val divider = View(this).apply {
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                setColor(Color.parseColor("#1E2D50"))
            }
            layoutParams = LinearLayout.LayoutParams(dp(60f), dp(1f)).also {
                it.topMargin = dp(6f); it.bottomMargin = dp(6f)
            }
        }

        outer.addView(boltLabel)
        outer.addView(divider)
        outer.addView(dataText)
        outer.addView(adsText)

        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        else
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.END
            x = dp(12f)
            y = dp(220f)
        }

        var iX = 0; var iY = 0; var iTx = 0f; var iTy = 0f
        outer.setOnTouchListener { _, ev ->
            when (ev.action) {
                MotionEvent.ACTION_DOWN -> {
                    iX = params.x; iY = params.y
                    iTx = ev.rawX; iTy = ev.rawY
                }
                MotionEvent.ACTION_MOVE -> {
                    params.x = iX - (ev.rawX - iTx).toInt()
                    params.y = iY + (ev.rawY - iTy).toInt()
                    wm.updateViewLayout(outer, params)
                }
            }
            true
        }

        rootView = outer
        wm.addView(outer, params)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val ch = NotificationChannel(
                CHANNEL_ID, "Data Booster Overlay",
                NotificationManager.IMPORTANCE_LOW
            ).apply { description = "Shows floating data booster widget" }
            (getSystemService(NOTIFICATION_SERVICE) as NotificationManager)
                .createNotificationChannel(ch)
        }
    }

    private fun buildNotification(): Notification {
        val launch = packageManager.getLaunchIntentForPackage(packageName)
        val pi = PendingIntent.getActivity(
            this, 0, launch,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Airvoy Data Booster")
            .setContentText("Overlay active — watching ads")
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setOngoing(true)
            .setContentIntent(pi)
            .build()
    }
}
