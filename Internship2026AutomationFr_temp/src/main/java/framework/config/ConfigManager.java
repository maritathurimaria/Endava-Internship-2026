package framework.config;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

public final class ConfigManager {

    private static final Properties PROPERTIES =
            new Properties();

    static {
        try (InputStream input =
                     ConfigManager.class
                             .getClassLoader()
                             .getResourceAsStream(
                                     "config.properties")) {

            if (input == null) {
                throw new IllegalStateException(
                        "config.properties was not found"
                );
            }

            PROPERTIES.load(input);

        } catch (IOException e) {
            throw new IllegalStateException(
                    "Failed to load config.properties", e
            );
        }
    }

    private ConfigManager() {
    }

    public static String get(String key) {
        String value = System.getProperty(key);

        if (value == null || value.isBlank()) {
            value = PROPERTIES.getProperty(key);
        }

        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(
                    "Missing configuration property: " + key
            );
        }

        return value.trim();
    }

    public static boolean getBoolean(String key) {
        String value = get(key);

        if (!value.equalsIgnoreCase("true")
                && !value.equalsIgnoreCase("false")) {
            throw new IllegalArgumentException(
                    "Property '" + key + "' must be true or false"
            );
        }

        return Boolean.parseBoolean(value);
    }

    public static int getInt(String key) {
        try {
            return Integer.parseInt(get(key));
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(
                    "Property '" + key
                            + "' must be an integer",
                    e
            );
        }
    }
}