import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.zip.*;

/** aapt2 on Windows can emit backslashes in asset names. APK paths must use '/'. */
class PackApk {
    public static void main(String[] args) throws Exception {
        if (args.length == 2 && args[0].equals("--verify")) {
            try (ZipFile zip = new ZipFile(args[1])) {
                for (ZipEntry entry : Collections.list(zip.entries())) {
                    if (entry.getName().contains("\\")) throw new IOException("Invalid APK path: " + entry.getName());
                    if (entry.getName().matches("assets/audio/.*\\.(wav|mp3)") && entry.getMethod() != ZipEntry.STORED)
                        throw new IOException("Audio must be uncompressed: " + entry.getName());
                }
                for (String name : new String[]{"assets/images/stress-mark.svg", "assets/audio/click.wav", "assets/audio/floating-cities.mp3"})
                    if (zip.getEntry(name) == null) throw new IOException("Missing Android asset: " + name);
            }
            System.out.println("APK paths and direct-access audio verified.");
            return;
        }
        if (args.length != 3) throw new IllegalArgumentException("PackApk resources.apk classes.dex output.apk");
        Set<String> names = new HashSet<>();
        try (ZipFile input = new ZipFile(args[0]);
             ZipOutputStream output = new ZipOutputStream(Files.newOutputStream(Path.of(args[2])))) {
            for (ZipEntry original : Collections.list(input.entries())) {
                String name = original.getName().replace('\\', '/');
                if (!names.add(name)) throw new IOException("Duplicate APK path: " + name);
                ZipEntry entry = new ZipEntry(name);
                entry.setMethod(original.getMethod());
                if (entry.getMethod() == ZipEntry.STORED) {
                    entry.setSize(original.getSize());
                    entry.setCrc(original.getCrc());
                }
                output.putNextEntry(entry);
                try (InputStream stream = input.getInputStream(original)) { stream.transferTo(output); }
                output.closeEntry();
            }
            output.putNextEntry(new ZipEntry("classes.dex"));
            Files.copy(Path.of(args[1]), output);
            output.closeEntry();
        }
    }
}
